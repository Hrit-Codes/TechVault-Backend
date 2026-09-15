import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OffersService } from '../offers/offers.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { CreateVariantsBulkDto } from './dto/create-variants-bulk.dto';
import { RedisService } from '../redis/redis.service';
import { createHash } from 'crypto';

const PRODUCTS_LIST_VERSION_KEY = 'products:list:version';
const PRODUCTS_LIST_KEY = (version: number, query: string) =>
  `products:list:v${version}:${query}`;
const PRODUCTS_SLUG_KEY = (slug: string) => `products:slug:${slug}`;
const PRODUCTS_VARIANTS_KEY = (id: string) => `products:variants:${id}`;

const PRODUCTS_LIST_TTL = 10 * 60; 
const PRODUCTS_DETAIL_TTL = 30 * 60; 

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly offersService: OffersService,
    private readonly redisService:RedisService
  ) {}

  private readonly NEW_PRODUCT_WINDOW_DAYS = 30;

  private computeIsNew(createdAt: Date): boolean {
    const ageInMs = Date.now() - createdAt.getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    return ageInDays <= this.NEW_PRODUCT_WINDOW_DAYS;
  }

  // Only requires createdAt — isNew (if present on T) is always overwritten anyway,
  // so it should never be part of the input constraint.
  private withComputedIsNew<T extends { createdAt: Date }>(
    product: T,
  ): T & { isNew: boolean } {
    return { ...product, isNew: this.computeIsNew(product.createdAt) };
  }

  private attachOfferInfo<T extends{
    id:string,
    brandId:string,
    categoryId:string,
    price:number,
    onSale:boolean,
    salePrice:number|null
  },>(
    product:T,
    activeOffers:Awaited<ReturnType<OffersService[`getActiveOffersForResolution`]>>,
  ){
    const resolved=this.offersService.resolveBestOfferForProduct(activeOffers, product);

    if(resolved){
      return{
        ...product,
        onSale:true,
        salePrice:resolved.discountedPrice,
        appliedOffer:{ id:resolved.offer.id, title:resolved.offer.title}
      }
    }

    return{
      ...product,
      appliedOffer:null,
    }
  }

  private generateSlug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  private extractPublicId(url: string, folder: string): string | null {
    const filename = url.split('/').pop()?.split('.')[0];
    return filename ? `${folder}/${filename}` : null;
  }

  private hashQuery(query: Record<string, unknown>): string {
      const sorted = Object.keys(query)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          if (query[k] !== undefined) acc[k] = query[k];
          return acc;
        }, {});
      return createHash('md5').update(JSON.stringify(sorted)).digest('hex').slice(0, 12);
    }

  private async getProductsListVersion():Promise<number>{
    const v=await this.redisService.get<number>(PRODUCTS_LIST_VERSION_KEY);
    return v??1;
  }

  private async bumpProductsListVersion():Promise<void>{
    try{
      await this.redisService.getClient().incr(PRODUCTS_LIST_VERSION_KEY);
    }catch(err){
      console.log(`Failed to bump products list version: ${(err as Error).message}`);
    }
  }

  private async invalidateProductCaches(opts:{
    slug?:string;
    productId?:string
  }):Promise<void>{
    const keys:string[]=[];
    if(opts.slug) keys.push(PRODUCTS_SLUG_KEY(opts.slug));
    if(opts.productId) keys.push(PRODUCTS_VARIANTS_KEY(opts.productId));
    if(keys.length) await this.redisService.del(...keys);
    await this.bumpProductsListVersion();
  }

  // ─── PUBLIC ────────────────────────────────────────────────
  async getProducts(query: QueryProductDto) {
    const {
      search,
      categoryId,
      categorySlug,
      brandId,
      brandSlug,
      minPrice,
      maxPrice,
      isNew,
      onSale,
      sortBy,
      page = 1,
      limit = 12,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (categorySlug) where.category = { slug: categorySlug };
    if (brandId) where.brandId = brandId;
    if (brandSlug) where.brand = { slug: brandSlug };
    if (minPrice !== undefined) where.price = { ...where.price, gte: minPrice };
    if (maxPrice !== undefined) where.price = { ...where.price, lte: maxPrice };

    // isNew is derived from createdAt, not stored — translate the filter into a date range
    if (isNew !== undefined) {
      const cutoff = new Date(Date.now() - this.NEW_PRODUCT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      where.createdAt = isNew ? { gte: cutoff } : { lt: cutoff };
    }

    if (onSale !== undefined) where.onSale = onSale;

    const orderBy: any =
      sortBy === 'price_asc'
        ? { price: 'asc' }
        : sortBy === 'price_desc'
          ? { price: 'desc' }
          : sortBy === 'rating_asc'
            ? { rating: 'asc' }
            : sortBy === 'rating_desc'
              ? { rating: 'desc' }
              : { createdAt: 'desc' };

    const version=await this.getProductsListVersion();
    const cacheKey=PRODUCTS_LIST_KEY(version, this.hashQuery({...query}));

    type RawList={total:number, products:any[]};
    let raw=await this.redisService.get<RawList>(cacheKey);

    if(!raw){
      const [total, products]=await Promise.all([
        this.prisma.product.count({where}),
        this.prisma.product.findMany({
          where,
          skip,
          take:limit,
          orderBy,
          select:{
            id:true,
            name:true,
            slug:true,
            description:true,
            price:true,
            salePrice:true,
            onSale:true,
            images:true,
            badge:true,
            freeShipping:true,
            rating:true,
            reviewCount:true,
            categoryId:true,
            brandId:true,
            createdAt:true
          }
        })
      ])

      raw={total,products};
      await this.redisService.set(cacheKey,raw,PRODUCTS_LIST_TTL);
    }

    const activeOffers=await this.offersService.getActiveOffersForResolution();

    const productsWithOffers = raw.products
      .map((p) => this.withComputedIsNew(p))
      .map((p) => this.attachOfferInfo(p, activeOffers));

    return {
      message: 'Products fetched successfully',
      data: productsWithOffers,
      pagination: {
        total:raw.total,
        page,
        limit,
        totalPages: Math.ceil(raw.total / limit),
        hasNextPage: page < Math.ceil(raw.total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async getProductBySlug(slug: string) {
    const cacheKey=PRODUCTS_SLUG_KEY(slug);

    let product=await this.redisService.get<any>(cacheKey);

    if(!product){
      product=await this.prisma.product.findUnique({
        where:{slug},
        include:{
          category:{ select:{id:true, name:true, slug:true}},
          brand:{ select:{id:true, name:true, slug:true, logo:true}},
          variants:{where:{isActive:true}}
        }
      });
      if(!product) throw new NotFoundException("Product nott found");
      await this.redisService.set(cacheKey,product,PRODUCTS_DETAIL_TTL);
    }

    const activeOffers=await this.offersService.getActiveOffersForResolution();

    const productWithOffer = this.attachOfferInfo(this.withComputedIsNew(product), activeOffers);

    return {
      message: 'Product fetched successfully',
      data: productWithOffer,
    };
  }

  // ─── ADMIN ────────────────────────────────────────────────
  async getAllProducts(query: QueryProductDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      isActive,
      stockStatus,
      onSale,
      sortBy,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId !== undefined) {
      where.categoryId = categoryId;
    }
    if (brandId !== undefined) {
      where.brandId = brandId;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    if (onSale !== undefined) {
      where.onSale = onSale;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    const LOW_STOCK_THRESHOLD = 10;
    if (stockStatus !== undefined) {
      if (stockStatus === 'out-of-stock') {
        where.stock = 0;
      } else if (stockStatus === 'low-stock') {
        where.stock = { gte: 0, lt: LOW_STOCK_THRESHOLD };
      }
    }

    const orderBy: any =
      sortBy === 'price_asc'
        ? { price: 'asc' }
        : sortBy === 'price_desc'
          ? { price: 'desc' }
          : sortBy === 'rating_asc'
            ? { rating: 'asc' }
            : sortBy === 'rating_desc'
              ? { rating: 'desc' }
              : { createdAt: 'desc' };

    const [total, products,activeOffers] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          images: true,
          price: true,
          stock: true,
          salePrice: true,
          onSale: true,
          categoryId: true,
          brandId: true,
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.offersService.getActiveOffersForResolution(),
    ]);

    const productsWithOffers = products
      .map((p) => this.withComputedIsNew(p))
      .map((p) => this.attachOfferInfo(p, activeOffers));

    return {
      message: 'All products fetched successfully',
      data: productsWithOffers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async getProductById(id: string) {
    const [product,activeOffers] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id },
        include: {
          brand: true,
          category: true,
          variants:true
        },
      }),
      this.offersService.getActiveOffersForResolution()
    ])
    if (!product) throw new NotFoundException('Product not found');

    const productWithOffer = this.attachOfferInfo(this.withComputedIsNew(product), activeOffers);

    return {
      message: 'Product fetched successfully',
      data: productWithOffer,
    };
  }

    async createProduct(dto: CreateProductDto, files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
        throw new BadRequestException('At least one product image is required');
    }

    const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const brand = await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    let slug = this.generateSlug(dto.name);
    const existingSlug = await this.prisma.product.findUnique({
        where: { slug },
    });
    if (existingSlug) {
        const shortHash = Math.random().toString(36).substring(2, 7);
        slug = `${slug}-${shortHash}`;
    }

    const imageUrls = await Promise.all(
        files.map((file) =>
        this.cloudinaryService.uploadImage(file, 'techvault/products'),
        ),
    );
    const images = imageUrls.map((r) => r.secure_url);

    const product = await this.prisma.product.create({
        data: {
        name: dto.name,
        slug, 
        description: dto.description,
        price: dto.price,
        salePrice: dto.salePrice,
        onSale: dto.onSale ?? false,
        images,
        badge: dto.badge,
        isActive: dto.isActive,
        freeShipping: dto.freeShipping ?? false,
        trustBadges: dto.trustBadges ?? [],
        features: dto.features ?? [],
        specifications: dto.specifications ?? [],
        stock: dto.stock ?? 0,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        },
        include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        },
    });

    await this.invalidateProductCaches({slug:product.slug});

    return {
        message: 'Product created successfully',
        data: this.withComputedIsNew(product),
    };
    }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    files: Express.Multer.File[],
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
      });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    let slug = product.slug;
    if (dto.name && dto.name !== product.name) {
      slug = this.generateSlug(dto.name);
      const existingSlug = await this.prisma.product.findUnique({
        where: { slug },
      });
      if (existingSlug) {
        const shortHash = Math.random().toString(36).substring(2, 7);
        slug = `${slug}-${shortHash}`;
      }
    }

    let images = product.images;
    if (files && files.length > 0) {
      await Promise.all(
        product.images.map(async (url) => {
          const publicId = this.extractPublicId(url, 'techvault/products');
          if (publicId) await this.cloudinaryService.deleteImage(publicId);
        }),
      );
      const uploadedImages = await Promise.all(
        files.map((file) =>
          this.cloudinaryService.uploadImage(file, 'techvault/products'),
        ),
      );
      images = uploadedImages.map((r) => r.secure_url);
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
        ...(dto.onSale !== undefined && { onSale: dto.onSale }),
        ...(dto.badge !== undefined && { badge: dto.badge }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.freeShipping !== undefined && { freeShipping: dto.freeShipping }),
        ...(dto.trustBadges !== undefined && { trustBadges: dto.trustBadges }),
        ...(dto.features !== undefined && { features: dto.features }),
        ...(dto.specifications !== undefined && { specifications: dto.specifications }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.brandId && { brandId: dto.brandId }),
        slug,
        images,
      },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });

    await this.invalidateProductCaches({slug:product.slug, productId:id});
    if (updatedProduct.slug!==product.slug){
      await this.redisService.del(PRODUCTS_SLUG_KEY(updatedProduct.slug));
    }

    return {
      message: 'Product updated successfully',
      data: this.withComputedIsNew(updatedProduct),
    };
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException('Product not found');

    await Promise.all(
      product.images.map(async (url) => {
        const publicId = this.extractPublicId(url, 'techvault/products');
        if (publicId) await this.cloudinaryService.deleteImage(publicId);
      }),
    );

    await this.prisma.product.delete({ where: { id } });

    await this.invalidateProductCaches({slug:product.slug, productId:id});
  }

  async toggleProductStatus(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException('Product not found');

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });

    await this.invalidateProductCaches({slug:product.slug, productId:id});

    return {
      message: `Product ${updatedProduct.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedProduct,
    };
  }

  async getVariants(productId:string){
    const cacheKey=PRODUCTS_VARIANTS_KEY(productId);
    
    const cached=await this.redisService.get<any>(cacheKey);
    if(cached) return cached;

    const product=await this.prisma.product.findUnique({where:{id:productId}});

    if(!product) throw new NotFoundException("Product not found");

    const variants=await this.prisma.productVariant.findMany({
      where:{productId},
      orderBy:[{color:"asc"},{variant:"asc"}]
    });

    const response={
      message:"Variants fetched successfully",
      data:variants
    }

    await this.redisService.set(cacheKey,response,PRODUCTS_DETAIL_TTL);
    return response;
  }

  async createVariant(productId:string,dto:CreateProductVariantDto){
    const product=await this.prisma.product.findUnique({where:{id:productId}});

    if(!product) throw new NotFoundException("Product not found");

    if(!dto.color && !dto.variant){
      throw new BadRequestException("A variant needs at least a color or a variant value");
    }

    const existing=await this.prisma.productVariant.findFirst({
      where:{
        productId,
        color:dto.color??null,
        variant:dto.variant??null
      }
    });

    if(existing){
      throw new BadRequestException("This color/variant combination already exists for this product")
    }

    const variant=await this.prisma.productVariant.create({
      data:{
        productId,
        color:dto.color,
        variant:dto.variant,
        priceOverride:dto.priceOverride,
        stockOverride:dto.stockOverride,
        isActive:dto.isActive??true
      }
    })

    await this.invalidateProductCaches({productId});

    return{
      message:"Variant created successfully",
      data:variant
    }
  }

  async updateVariant(productId:string, variantId:string, dto:UpdateProductVariantDto){
    const variant=await this.prisma.productVariant.findUnique({where:{id:variantId}})

    if(!variant || variant.productId!==productId){
      throw new NotFoundException("Variant not found");
    }

    const updated=await this.prisma.productVariant.update({
      where:{id:variantId},
      data:{
        ...(dto.color!==undefined && {color:dto.color}),
        ...(dto.variant!==undefined && {variant:dto.variant}),
        ...(dto.priceOverride!==undefined && {priceOverride:dto.priceOverride}),
        ...(dto.stockOverride!==undefined && {stockOverride:dto.stockOverride}),
        ...(dto.isActive!==undefined && {isActive:dto.isActive}),
      }
    })

    await this.invalidateProductCaches({productId});

    return{
      message:"Variant updated successfully",
      data:updated
    }
  }

  async deleteVariant(productId:string, variantId:string){
    const variant=await this.prisma.productVariant.findUnique({where:{id:variantId}});

    if(!variant || variant.productId!==productId){
      throw new NotFoundException("Variant not found");
    }

    await this.prisma.productVariant.delete({where:{id:variantId}});
    await this.invalidateProductCaches({productId});
  }

  async createVariantsBulk(productId:string, dto:CreateVariantsBulkDto){
    const product=await this.prisma.product.findUnique({where:{id:productId}});

    if(!product) throw new NotFoundException("Product not found");

    const colors=dto.colors?.length? dto.colors:[null];
    const variants=dto.variants?.length? dto.variants:[null];

    if(colors.length===1 && colors[0]===null && variants.length===1 && variants[0]===null){
      throw new BadRequestException("Provide at least one color or one variant value");
    }

    const combinations=colors.flatMap((color)=>
      variants.map((variant)=>({color,variant}))
    );

    const existing=await this.prisma.productVariant.findMany({
      where:{productId},
      select:{color:true, variant:true}
    });

    const existingKeys=new Set(existing.map((e)=>`${e.color??""}::${e.variant??""}`));

    const toCreate=combinations.filter(
      (c)=>!existingKeys.has(`${c.color??""}::${c.variant??""}`)
    )

    if(toCreate.length===0){
      throw new BadRequestException("All requested combinations already exist for this product");
    }

    const rows=toCreate.map((c)=>{
      const priceOverride=c.variant? dto.priceMap?.[c.variant]:undefined;

      const stockKey=c.color? `${c.color}::${c.variant??""}`:(c.variant??"");
      const stockOverride=dto.stockMap?.[stockKey]??dto.defaultStock??0;

      return{
        productId,
        color:c.color,
        variant:c.variant,
        priceOverride,
        stockOverride
      }
    });

    const created = await this.prisma.$transaction(
      rows.map((row) => this.prisma.productVariant.create({ data: row })),
    );

    await this.invalidateProductCaches({productId});

    return{
      message:`${created.length} variant(s) created successfully`,
      data:created
    }
  }
}