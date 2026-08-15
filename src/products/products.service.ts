import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
    constructor(
        private readonly prisma:PrismaService,
        private readonly cloudinaryService:CloudinaryService
    ){}

    private generateSlug(name:string):string{
        return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    private extractPublicId(url:string,folder:string):string|null{
        const filename=url.split("/").pop()?.split(".")[0];
        return filename? `${folder}/${filename}`:null;
    }

    async getProducts(query:QueryProductDto){
        const{
            search, categoryId, categorySlug, brandId,brandSlug,minPrice,maxPrice,isNew,onSale,sortBy,page=1,limit=12
        }=query;

        const skip=(page-1)*limit;
        const where:any={isActive:true};

        if(search){
            where.OR=[
                {name:{contains:search,mode:"insensitive"}},
                {description:{contains:search,mode:"insensitive"}}
            ]
        }

        if(categoryId) where.categoryId=categoryId;
        if(categorySlug) where.category={slug:categorySlug};
        if(brandId) where.brandId=brandId;
        if(brandSlug) where.brand={slug:brandSlug};
        if(minPrice!==undefined) where.price={...where.price,gte:minPrice};
        if(maxPrice!==undefined) where.price={...where.price,lte:maxPrice};
        if(isNew!==undefined) where.isNew=isNew;
        if(onSale!==undefined) where.onSale=onSale;

        const orderBy:any=
            sortBy==="price_asc"?{price:"asc"}:
            sortBy==="price_desc"?{price:"desc"}:
            sortBy==="rating"?{rating:"desc"}:
            {createdAt:"desc"};

        const [total,products]=await Promise.all([
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
                    isNew:true,
                    freeShipping:true,
                    rating:true,
                    reviewCount:true,
                    categoryId:true,
                    brandId:true
                }
            })
        ])

        return{
            message:"Products fetched successfully",
            data:products,
            pagination:{
                total,
                page,
                limit,
                totalPages:Math.ceil(total/limit),
                hasNextPage:page<Math.ceil(total/limit),
                hasPrevPage:page>1
            }
        }

    }

    async getProductBySlug(slug:string) {
        const product=await this.prisma.product.findUnique({
            where:{slug},
            include:{
                category:{select:{id:true, name:true, slug:true}},
                brand:{select:{id:true, name:true, slug:true, logo:true}},
            }
        })
        if(!product) throw new NotFoundException("Product not found");

        return {message:"Product fetched successfully",product};
    }

    // async getProductReviews(productId:string,page=1,limit=10){
    //     const product=await this.prisma.product.findUnique({
    //         where:{id:productId}
    //     })

    //     if(!product) throw new NotFoundException("Product not found");

    //     const skip=(page-1)*limit;

    //     const [reviews,total]=await Promise.all([
    //         this.prisma.review.findMany({
    //             where:{productId},
    //             orderBy:{createdAt:"asc"},
    //             skip,
    //             take:limit,
    //         }),
    //         this.prisma.review.count({
    //             where:{productId}
    //         }),
    //     ]);

    //     return {
    //         message:"Reviews fetched successfully",
    //         data:reviews,
    //         pagination:{
    //             total,
    //             page,
    //             limit,
    //             totalPages:Math.ceil(total/limit),
    //             hasNextPage:page<Math.ceil(total/limit),
    //             hasPrevPage:page>1
    //         }
    //     }
    // }

    async getProductById(id:string){
        const product=await this.prisma.product.findUnique({
            where:{id},
            include:{
                brand:true,
                category:true
            }
        })

        if(!product) throw new NotFoundException("Product not found");

        return{
            message:"Product fetched successfully",
            product
        }
    }


    async getAllProducts(query:QueryProductDto){
        const {
            page=1, limit=12, search
        }=query;

        const skip=(page-1)*limit;
        const where:any={}

        if(search){
            where.OR=[
                {name:{contains:search,mode:"insensitive"}}
            ];
        }

        const [total,products]=await Promise.all([
            this.prisma.product.count({
                where
            }),
            this.prisma.product.findMany({
                where,
                skip,
                take:limit,
                orderBy:{createdAt:"desc"},
                select:{
                    id:true,
                    name:true,
                    slug:true,
                    description:true,
                    images:true,
                    price:true,
                    stock:true,
                    salePrice:true,
                    onSale:true,
                    categoryId:true,
                    brandId:true,
                    category:{select:{id:true, name:true}},
                    brand:{select:{id:true, name:true}},
                    isActive:true,
                    createdAt:true,
                    updatedAt:true,
                },
            }),
        ]);

        return{
            message:"All products fetched successfully",
            data:products,
            pagination:{
                total,
                page,
                limit,
                totalPages:Math.ceil(total/limit),
                hasNextPage:page<Math.ceil(total/limit),
                hasPrevPage:page>1
            }
        }
    }

    async deleteProduct(id:string){
        const product= await this.prisma.product.findUnique({where:{id}});
        if(!product) throw new NotFoundException("Product not found");

        await Promise.all(
            product.images.map(async(url)=>{
                const publicId=this.extractPublicId(url,"techvault/products");
                if(publicId) await this.cloudinaryService.deleteImage(publicId);
            })
        );

        await this.prisma.product.delete({
            where:{id}
        })

        return{
            message:"Product deleted successfully",
            data:{
                id:product.id,
                name:product.name
            }
        }
    }

    async toggleProductStatus(id:string){
        const product= await this.prisma.product.findUnique({where:{id}})
        if(!product) throw new NotFoundException("Product not found");

        const updatedProduct=await this.prisma.product.update({
            where:{id},
            data:{isActive:!product.isActive},
        });

        return{
            message:`Product ${updatedProduct.isActive?"activated":"deactivated"} successfully`,
            product:updatedProduct
        }
    }

    async createProduct(dto:CreateProductDto, files:Express.Multer.File[]){
        if(!files || files.length===0){
            throw new BadRequestException("At least one product image is required");
        }

        const category= await this.prisma.category.findUnique({
            where:{id:dto.categoryId}
        })

        if(!category) throw new NotFoundException("Category not found");

        const brand= await this.prisma.brand.findUnique({
            where:{id:dto.brandId}
        })

        if(!brand) throw new NotFoundException("Brand not found");

        let slug;
        if(dto.name){
            slug=this.generateSlug(dto.name);
            const existingSlug=await this.prisma.product.findUnique({
                where:{slug}
            })
            if(existingSlug){
                const shortHash=Math.random().toString(36).substring(2,7); 
                slug=`${slug}-${shortHash}`;
            }
        }
        
        const imageUrls=await Promise.all(
            files.map(file=>
                this.cloudinaryService.uploadImage(file,"techvault/products")
            )
        );

        const images=imageUrls.map(r=>r.secure_url);

        const product=await this.prisma.product.create({
            data:{
                name:dto.name,
                slug:slug,
                description:dto.description,
                price:dto.price,
                salePrice:dto.salePrice,
                onSale:dto.onSale??false,
                images,
                badge:dto.badge,
                isNew:dto.isNew,
                isActive:dto.isActive,
                freeShipping:dto.freeShipping??false,
                trustBadges:dto.trustBadges??[],
                features:dto.features??[],
                specifications:dto.specifications??[],
                stock:dto.stock??0,
                categoryId:dto.categoryId,
                brandId:dto.brandId
            },
            include:{
                category:{select:{id:true,name:true,slug:true}},
                brand:{select:{id:true, name:true, slug:true}}
            }
        });

        return{
            message:"Product created successfully",
            product
        }
    }

    async updateProduct(id:string, dto:UpdateProductDto, files:Express.Multer.File[]){
        const product=await this.prisma.product.findUnique({
            where:{id}
        })

        if(!product) throw new NotFoundException("Product not found");

        if(dto.categoryId){
            const category=await this.prisma.category.findUnique({
                where:{id:dto.categoryId}
            })
            if(!category) throw new NotFoundException("Category not found");
        }

        if(dto.brandId){
            const brand=await this.prisma.brand.findUnique({
                where:{id:dto.brandId},
            })
            if(!brand) throw new NotFoundException("Brand not found");
        }

        let slug=product.slug;

        if(dto.name && dto.name!==product.name){
            slug=this.generateSlug(dto.name)
            const existingSlug=await this.prisma.product.findUnique({
                where:{slug}
            })

            if(existingSlug){
                const shortHash=Math.random().toString(36).substring(2,7);
                slug=`${slug}-${shortHash}`
            }
        };

        let images=product.images;
        if(files && files.length>0){
            await Promise.all(
                product.images.map(async(url)=>{
                    const publicId=this.extractPublicId(url,"techvault/products");
                    if(publicId) await this.cloudinaryService.deleteImage(publicId);
                })
            );
            const uploadedImages=await Promise.all(
                files.map(file=>
                    this.cloudinaryService.uploadImage(file,"techvault/products")
                )
            );

            images=uploadedImages.map(r=>r.secure_url);
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
                ...(dto.isNew !== undefined && { isNew: dto.isNew }),
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

        return { message: 'Product updated successfully', product: updatedProduct };
    }

}
