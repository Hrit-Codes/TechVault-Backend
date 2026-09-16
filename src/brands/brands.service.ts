import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { RedisService } from '../redis/redis.service';

const BRANDS_CACHE_KEY="brands:all";
const BRANDS_ACTIVE_CACHE_KEY="brands:active";
const BRANDS_STATS_CACHE_KEY="brands:stats";
const BRANDS_CACHE_TTL=30*60;
const BRANDS_STATS_TTL=5*60;

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly redisService:RedisService
  ) {}

  private async clearBrandsCache(slug?: string) {
    const keysToDelete = [BRANDS_CACHE_KEY, BRANDS_ACTIVE_CACHE_KEY,BRANDS_STATS_CACHE_KEY];
    if (slug) {
      keysToDelete.push(`brands:slug:${slug}`);
    }
    await this.redisService.del(...keysToDelete);
  }

  // ─── PUBLIC ────────────────────────────────────────────────
  async getActiveBrands() {
    const cached=await this.redisService.get<any>(BRANDS_ACTIVE_CACHE_KEY);
    if(cached){
      return{
        message:"Active brands fetched successfully",
        data:cached
      }
    }
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, logo: true, slug: true },
    });

    await this.redisService.set(BRANDS_ACTIVE_CACHE_KEY,brands,BRANDS_CACHE_TTL);

    return {
      message: 'Active brands fetched successfully',
      data: brands,
    };
  }

  async getBrandBySlug(slug: string) {
    const cacheKey=`brands:slug:${slug}`;
    const cached=await this.redisService.get<any>(cacheKey);
    if(cached){
      return{
        message:"Brand fetched successfully",
        data:cached
      }
    }
    const brand = await this.prisma.brand.findUnique({
      where: { slug },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    await this.redisService.set(cacheKey, brand, BRANDS_CACHE_TTL);
    return {
      message: 'Brand fetched successfully',
      data: brand,
    };
  }

  // ─── ADMIN ────────────────────────────────────────────────
  async getAllBrands() {
    const cached=await this.redisService.get(BRANDS_CACHE_KEY);
    if(cached){
      return{
        message:"Brands fetched successfully",
        data:cached
      }
    }
    const brands = await this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
    });

    await this.redisService.set(BRANDS_CACHE_KEY, brands, BRANDS_CACHE_TTL);

    return {
      message: 'Brands fetched successfully',
      data: brands,
    };
  }

  async createBrand(dto: CreateBrandDto, file?: Express.Multer.File) {
    const existingName = await this.prisma.brand.findFirst({
      where: {
        name: {
          equals: dto.name,
          mode: 'insensitive',
        },
      },
    });
    if (existingName) throw new ConflictException('Brand name already exists');

    const slug = dto.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let logoUrl: string | undefined;
    if (file) {
      const result = await this.cloudinaryService.uploadImage(file, 'techvault/brands');
      logoUrl = result.secure_url;
    }

    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name,
        slug,
        logo: logoUrl,
        isActive: dto.isActive ?? true,
      },
    });

    await this.clearBrandsCache();

    return {
      message: 'Brand created successfully',
      data: brand,
    };
  }

  async updateBrand(id: string, dto: UpdateBrandDto, file?: Express.Multer.File) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');

    if (dto.name && dto.name !== brand.name) {
      const existingName = await this.prisma.brand.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (existingName) throw new ConflictException('Brand name already exists');
    }

    let slug = brand.slug;
    if (dto.name) {
      slug = dto.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    let logoUrl = brand.logo;
    if (file) {
      if (brand.logo) {
        const publicId = brand.logo.split('/').pop()?.split('.')[0];
        if (publicId) {
          await this.cloudinaryService.deleteImage(`techvault/brands/${publicId}`);
        }
      }
      const result = await this.cloudinaryService.uploadImage(file, 'techvault/brands');
      logoUrl = result.secure_url;
    }

    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        logo: logoUrl,
        slug,
      },
    });

    await this.clearBrandsCache();

    return {
      message: 'Brand updated successfully',
      data: updatedBrand,
    };
  }

  async deleteBrand(id: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    if (brand.logo) {
      const publicId = brand.logo.split('/').pop()?.split('.')[0];
      if (publicId) {
        await this.cloudinaryService.deleteImage(`techvault/brands/${publicId}`);
      }
    }

    await this.clearBrandsCache();

    await this.prisma.brand.delete({ where: { id } });
  }

  async toggleBrandStatus(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: { isActive: !brand.isActive },
    });

    await this.clearBrandsCache(brand.slug);

    return {
      message: `Brand ${updatedBrand.isActive ? 'Activated' : 'Deactivated'} successfully`,
      data: updatedBrand,
    };
  }

  async getBrandStats(){
    const cached=await this.redisService.get<any>(BRANDS_STATS_CACHE_KEY);
    if(cached){
      return{
        message:"Brand statistics fetched succesfully",
        data:cached
      }
    }

    const [totalBrands, activeBrands,brandsWithProducts]=await Promise.all([
      this.prisma.brand.count(),
      this.prisma.brand.count({where:{isActive:true}}),
      this.prisma.brand.findMany({
        include:{
          _count:{select:{products:true}},
          products:{
            select:{
              price:true,
              stock:true
            }
          }
        }
      })
    ]);
    const inactiveBrands=totalBrands-activeBrands;
    const emptyBrands=brandsWithProducts.filter((b)=>b._count.products===0).length;

    const topByCatalog=brandsWithProducts.sort((a,b)=>b._count.products-a._count.products)[0];

    const topByInventory=brandsWithProducts.map(brand=>({
      ...brand,
      inventoryValue:brand.products.reduce(
        (sum,p)=>sum+p.price*p.stock,0
      )
    }))
    .sort((a,b)=>b.inventoryValue-a.inventoryValue)[0];

    const stats={
        totalBrands,
        activeBrands,
        inactiveBrands,
        emptyBrands,
        topBrandByProducts:topByCatalog?{
          name:topByCatalog.name,
          productCount:topByCatalog._count.products
        }:null,
        topBrandByInventoryValue:topByInventory?{
          name:topByInventory.name,
          inventoryValue:Math.round(topByInventory.inventoryValue*10)/10,
        }:null,
    }

    await this.redisService.set(BRANDS_STATS_CACHE_KEY,stats,BRANDS_STATS_TTL);

    return{
      message:"Brand statistics fetched succesfully",
      data:stats
    }
  }
  
}