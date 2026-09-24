import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { QueryOfferDto } from './dto/query-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OfferType } from '@prisma/client';
import { QueryOfferProductsDto } from './dto/query-offer-products.dto';
import { attachOfferInfo, withComputedIsNew, withEffectivePrice, withEffectiveStock } from '../products/utils/product-decorators';

export type ResolveableOffer={
    id:string;
    title:string;
    offerType:OfferType;
    offerValue:number;
    productIds:Set<string>;
    brandIds:Set<string>;
    categoryIds:Set<string>;
}


@Injectable()
export class OffersService {
    constructor(
        private readonly prisma:PrismaService,
        private readonly cloudinaryService:CloudinaryService
    ){}

    private async validateTargetsExist(productIds?: string[], brandIds?: string[], categoryIds?: string[]) {
        if (productIds?.length) {
            const count = await this.prisma.product.count({ where: { id: { in: productIds }, isActive:true } });
            if (count !== productIds.length) {
                throw new BadRequestException("One or more selected products do not exist or are inactive");
            }
        }

        if (brandIds?.length) {
            const count = await this.prisma.brand.count({ where: { id: { in: brandIds }, isActive:true } });
            if (count !== brandIds.length) {
                throw new BadRequestException("One or more brands do not exist or are inactive");
            }
        }

        if (categoryIds?.length) {
            const count = await this.prisma.category.count({ where: { id: { in: categoryIds }, isActive:true } });
            if (count !== categoryIds.length) {
                throw new BadRequestException("One or more categories do not exist or are inactive");
            }
        }
    }

    private readonly offerInclude={
        products:{ include:{ product: {select:{id:true, name:true, slug:true, images:true}}}},
        brands:{include:{brand: {select:{id:true, name:true, slug:true, logo:true}}}},
        categories:{include:{category:{select:{id:true, name:true, slug:true, image:true}}}}
    }

    async createOffer(dto:CreateOfferDto, bannerFile:Express.Multer.File){
        if(!bannerFile){
            throw new BadRequestException("A banner image is required");
        }

        const startDate= new Date(dto.startDate);
        const endDate= new Date(dto.endDate);

        if(endDate<=startDate){
            throw new BadRequestException("endDate must be after startDate");
        }

        const hasAnyTarget=
            (dto.productIds?.length??0)>0||
            (dto.brandIds?.length??0)>0||
            (dto.categoryIds?.length??0)>0;

        if(!hasAnyTarget){
            throw new BadRequestException("Select at least one product, brand, or category for this offer");
        }

        await this.validateTargetsExist(dto.productIds,dto.brandIds,dto.categoryIds);

        const uploaded= await this.cloudinaryService.uploadImage(bannerFile,"techvault/offers");

        const offer=await this.prisma.offer.create({
            data:{
                title:dto.title,
                description:dto.description,
                bannerImage:uploaded.secure_url,
                offerType:dto.offerType,
                offerValue:dto.offerValue,

                startDate:startDate,
                endDate:endDate,
                isActive:dto.isActive??true,

                products:{ create: (dto.productIds??[]).map((productId)=>({productId}))},
                brands:{ create: (dto.brandIds??[]).map((brandId)=>({brandId}))},
                categories:{ create:(dto.categoryIds??[]).map((categoryId)=>({categoryId}))}
            },
            include:this.offerInclude,
        });

        return { message:"Offer created successfully", offer};
    }

    async updateOffer(id:string, dto:UpdateOfferDto, bannerFile?:Express.Multer.File){
        const existing=await this.prisma.offer.findUnique({where:{id}})

        if(!existing) throw new NotFoundException("Offer not found");

        const startDate= dto.startDate? new Date(dto.startDate):existing.startDate;
        
        const endDate=dto.endDate? new Date(dto.endDate):existing.endDate;

        if(endDate<=startDate)
            throw new BadRequestException("endDate must be after startDate");

        await this.validateTargetsExist(dto.productIds, dto.brandIds, dto.categoryIds);

        let bannerImage=existing.bannerImage;

        if(bannerFile){
            const publicId=existing.bannerImage.split('/').pop()?.split('.')[0];
            await this.cloudinaryService.deleteImage(`techvault/offers/${publicId}`);

            const uploaded=await this.cloudinaryService.uploadImage(bannerFile,'techvault/offers')
            bannerImage=uploaded.secure_url;
        }

        const updatedOffer=await this.prisma.$transaction(async(tx)=>{
            if(dto.productIds!==undefined){
                await tx.offerProduct.deleteMany({where:{offerId:id}})
                if (dto.productIds.length > 0) {
                    await tx.offerProduct.createMany({
                        data: dto.productIds.map((productId) => ({ offerId: id, productId })),
                    });
                }
            }

            if (dto.brandIds !== undefined) {
                await tx.offerBrand.deleteMany({ where: { offerId: id } });
                if (dto.brandIds.length > 0) {
                    await tx.offerBrand.createMany({
                        data: dto.brandIds.map((brandId) => ({ offerId: id, brandId })),
                    });
                }
            }

            if(dto.categoryIds!==undefined){
                await tx.offerCategory.deleteMany({where:{offerId:id}})
                if (dto.categoryIds?.length>0){
                    await tx.offerCategory.createMany({
                        data: dto.categoryIds?.map((categoryId)=>({offerId:id, categoryId}))
                    })
                }
            }

            return tx.offer.update({
                where:{id},
                data:{
                    ...(dto.title && {title:dto.title}),
                    ...(dto.description !==undefined && {description:dto.description}),
                    ...(dto.offerType!==undefined && {offerType:dto.offerType}),
                    ...(dto.offerValue!==undefined && {offerValue:dto.offerValue}),
                    ...(dto.startDate!==undefined && {startDate:dto.startDate}),
                    ...(dto.endDate!==undefined && {endDate:dto.endDate}),
                    ...(dto.isActive!==undefined && {isActive:dto.isActive}),
                    bannerImage
                },
                include:this.offerInclude
            })
        })

        return {
            message:"Offer updated successfully",
            offer:updatedOffer
        }

    }

    async getAllOffers(query:QueryOfferDto){
        const { page=1, limit=12, search, isActive}=query;

        const skip=(page-1)*limit;
        const where:any={}

        if(search){
            where.title={contains:search,mode:"insensitive"}
        }
        if(isActive!==undefined){
            where.isActive=isActive
        }

        const [total, offers]=await Promise.all([
            this.prisma.offer.count({where}),
            this.prisma.offer.findMany({
                where,
                skip,
                select:{
                    id:true,
                    bannerImage:true,
                    title:true,
                    offerType:true,
                    offerValue:true,
                    startDate:true,
                    endDate:true,
                    isActive:true
                },
                take:limit,
                orderBy:{title:"desc"},
            }),
        ]);

        return{
            message:"Offers fetched succesfully",
            data:offers,
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

    async getOfferById(id:string){
        const offer=await this.prisma.offer.findUnique({
            where:{id},
            include:this.offerInclude
        })

        if(!offer){
            throw new BadRequestException("Offer not found");
        }

        return {
            message:"Offer fetched successfully",
            data:offer
        }
    }

    async toggleOfferActive(id:string){
        const offer=await this.prisma.offer.findUnique({
            where:{id},
        })

        if(!offer){
            throw new BadRequestException("Offer not found");
        }

        const updated=await this.prisma.offer.update({
            where:{id},
            data:{
                isActive:!offer.isActive
            }
        })

        return{
            message:`Offer ${updated.isActive?"activated":"deactivated"} successfully`,
            offer:updated
        }
    }

    async getActiveOffers(query:QueryOfferDto){
        const {search}=query
        const where:any={}

        if(search){
            where.title={contains:search,mode:"insensitive"}
        }
        where.isActive=true;

        const offers=await this.prisma.offer.findMany({
            where,
        })

        return {
            data:offers
        }
    }

    async deleteOffer(id:string){
        const offer=await this.prisma.offer.findUnique({
            where:{id}
        })

        if(!offer){
            throw new NotFoundException("Offer not found")
        }

        const publicId=offer.bannerImage.split('/').pop()?.split('.')[0];
        await this.cloudinaryService.deleteImage(`techvault/offers/${publicId}`);

        await this.prisma.offer.delete({
            where:{id}
        })

        return{
            message:"Offer deleted succesfully",
            data:{id:offer.id, title:offer.title}
        }
    }

    async getOfferStats(){
        const now= new Date();

        const [total, active, upcoming,expired]=await Promise.all([
            this.prisma.offer.count(),
            this.prisma.offer.count({where:{isActive:true}}),
            this.prisma.offer.count({where:{startDate:{gt:now}}}),
            this.prisma.offer.count({where:{endDate:{lt:now}}})
        ])

        return{
            message:"Offer stats fetched succesfully",
            data:{
                total,
                active,
                upcoming,
                expired
            }
        }

    }

    async getActiveOfferByIdWithProducts(id:string, query:QueryOfferProductsDto){
        const { page=1, limit=12 }=query;
        const skip=(page-1)*limit;

        const offer=await this.prisma.offer.findUnique({
            where:{id},
            select:{
                id:true,
                title:true,
                description:true,
                bannerImage:true,
                offerType:true,
                offerValue:true,
                startDate:true,
                endDate:true,
                isActive:true,
                products:{select:{productId:true}},
                brands:{select:{brandId:true}},
                categories:{select:{categoryId:true}}
            }
        })

        if(!offer){
            throw new NotFoundException("Offer not found");
        }

        const productIds=offer.products.map((p)=>p.productId);
        const brandIds=offer.brands.map((b)=>b.brandId);
        const categoryIds=offer.categories.map((c)=>c.categoryId);

        if(!productIds.length && !brandIds.length && !categoryIds.length){
            return{
                message:"Offer products fetched succesfully",
                data:{
                    offer:{
                        id:offer.id,
                        title:offer.title,
                        description:offer.description,
                        bannerImage:offer.bannerImage,
                        offerType:offer.offerType,
                        offerValue:offer.offerValue,
                        startDate:offer.startDate,
                        endDate:offer.endDate,
                        isActive:offer.isActive
                    },
                    products:[],
                    pagination:{
                        total:0,
                        page,
                        limit,
                        totalPages:0,
                        hasNextPage:false,
                        hasPrevPage:false
                    }
                }
            }
        }

        const orClauses:any[]=[];
        if (productIds.length) orClauses.push({id:{in:productIds}});
        if (brandIds.length) orClauses.push({brandId:{in:brandIds}});
        if (categoryIds.length) orClauses.push({categoryId:{in:categoryIds}});

        const where={
            isActive:true,
            OR:orClauses
        }

        const [total,products,allActiveOffers]=await Promise.all([
            this.prisma.product.count({where}),
            this.prisma.product.findMany({
                where,
                skip,
                take:limit,
                orderBy:{createdAt:"asc"},
                select:{
                    id:true,
                    name:true,
                    slug:true,
                    description:true,
                    images:true,
                    price:true,
                    salePrice:true,
                    onSale:true,
                    badge:true,
                    freeShipping:true,
                    rating:true,
                    reviewCount:true,
                    categoryId:true,
                    brandId:true,
                    createdAt:true,
                    stock:true,
                    category:{select:{id:true, name:true, slug:true}},
                    brand:{select:{id:true, name:true, slug:true, logo:true}},
                    variants:{
                        select:{isActive:true, priceOverride:true, stockOverride:true}
                    }
                }
            }),
            this.getActiveOffersForResolution(),
        ])

        const productsWithOffer=products.map((p)=>{
            // Variant-aware effective price
            const withPrice=withEffectivePrice(p);
            // Variant-aware effective stock
            const withStock=withEffectiveStock(withPrice);
            // isNew flag
            const decorated=withComputedIsNew(withStock);

            return attachOfferInfo(decorated,allActiveOffers);
        })

        return{
            message:"Offer products fetched succesfully",
            data:{
                offer:{
                    id:offer.id,
                    title:offer.title,
                    description:offer.description,
                    bannerImage:offer.bannerImage,
                    offerType:offer.offerType,
                    offerValue:offer.offerValue,
                    startDate:offer.startDate,
                    endDate:offer.endDate,
                    isActive:offer.isActive
                },
                products:productsWithOffer,
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
    }

    async getActiveOffersForResolution():Promise<ResolveableOffer[]>{
        const now = new Date();

        const offers=await this.prisma.offer.findMany({
            where:{
                isActive:true,
                startDate:{lte:now},
                endDate:{gte:now}
            },
            select:{
                id:true,
                title:true,
                offerType:true,
                offerValue:true,
                products:{ select:{productId:true}},
                brands:{ select:{brandId:true}},
                categories:{ select:{categoryId:true}}
            }
        })

        return offers.map((o) => ({
            id: o.id,
            title: o.title,
            offerType: o.offerType,
            offerValue: o.offerValue,
            productIds: new Set(o.products.map((p) => p.productId)),
            brandIds: new Set(o.brands.map((b) => b.brandId)),
            categoryIds: new Set(o.categories.map((c) => c.categoryId)),
        }));
    }

    resolveBestOfferForProduct(
        offers:ResolveableOffer[],
        product:{ id:string, brandId:string, categoryId:string, price:number}
    ):{ offer:ResolveableOffer, discountedPrice:number}|null{
        const matching=offers.filter((o)=>
            o.productIds.has(product.id) ||
            o.brandIds.has(product.brandId) ||
            o.categoryIds.has(product.categoryId),
        );

        if(matching.length===0) return null;

        let best:{ offer:ResolveableOffer , discountedPrice:number}|null=null;

        for(const offer of matching){
            const discountedPrice=this.computeDiscountedPrice(
                product.price,
                offer.offerType,
                offer.offerValue
            );
            if(!best || discountedPrice<best.discountedPrice){
                best={offer,discountedPrice}
            }
        }

        return best;
    }

    private computeDiscountedPrice(
        price:number,
        offerType:OfferType,
        offerValue:number
    ):number{
        const discounted=offerType==="PERCENTAGE"?price-(price*offerValue)/100:price-offerValue;

        return Math.max(0, Math.round(discounted*100)/100)
    }

    
}

