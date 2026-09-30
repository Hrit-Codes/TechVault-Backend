import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OffersService } from '../offers/offers.service';
import { attachOfferInfo, withComputedIsNew, withEffectivePrice, withEffectiveStock } from '../products/utils/product-decorators';
import { GetWishlistDto } from './dto/get-wishlist.dto';

@Injectable()
export class WishlistService {
    constructor(
        private readonly prismaService:PrismaService,
        private readonly offersService:OffersService
    ){}

    async getWishlist(userId:string,query:GetWishlistDto){
        const {page=1,limit=12}=query;
        const skip=(page-1)*limit;

        const [total,wishlist] =await Promise.all([
            this.prismaService.wishlistItem.count({where:{userId}}),
            this.prismaService.wishlistItem.findMany({
            where:{userId},


            
            skip,
            take:limit,
            orderBy:{createdAt:"asc"},
            select:{
                id:true,
                createdAt:true,
                product:{
                    select:{
                        id:true,
                        name:true,
                        slug:true,
                        price:true,
                        salePrice:true,
                        onSale:true,
                        images:true,
                        badge:true,
                        freeShipping:true,
                        rating:true,
                        reviewCount:true,
                        createdAt:true,
                        stock:true,
                        categoryId:true,
                        brandId:true,
                        variants:{
                            select:{isActive:true, priceOverride:true, stockOverride:true}
                        }
                    }
                }
            }
        })
        ])

        const activeOffers=await this.offersService.getActiveOffersForResolution();

        const decoratedWishlist=wishlist.map((item)=>({
            ...item,
            product:attachOfferInfo(withComputedIsNew(withEffectivePrice(withEffectiveStock(item.product))),
            activeOffers,
        )
        }))

        return{
            message:"Wishlist fetched successfully",
            data:decoratedWishlist,
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

    async getWishlistIds(userId:string):Promise<{data:string[]}>{
        const rows=await this.prismaService.wishlistItem.findMany({
            where:{userId},
            select:{productId:true}
        });

        return{
            data:rows.map((r)=>r.productId),
        }
    }

    async addToWishlist(userId:string, productId:string){
        const product=await this.prismaService.product.findUnique({
            where:{id:productId}
        })

        if(!product) throw new NotFoundException("Product not found");

        const existing=await this.prismaService.wishlistItem.findUnique({
            where:{
                userId_productId:{userId,productId}
            }
        });

        if(existing){
            return { message:"Product already in wishlist"}
        }

        const wishlistItem=await this.prismaService.wishlistItem.create({
            data:{
                userId,
                productId,
            },
            include:{
                product:true
            }
        })

        return {
            message:"Added to wishlist",
        }
    }

    async removeFromWishlist(userId:string, productId:string){
        const wishlistItem=await this.prismaService.wishlistItem.findUnique({
            where:{
                userId_productId:{userId,productId}
            }
        });

        if(!wishlistItem) throw new NotFoundException("Item not found in wishlist");

        await this.prismaService.wishlistItem.delete({
            where:{
                userId_productId:{userId,productId}
            }
        })

        return {
            message:"Removed from wishlist"
        }
    }

    async clearWishlist(userId:string){
        await this.prismaService.wishlistItem.deleteMany({
            where:{
                userId
            }
        })

        return {
            message:"Wishlist cleared"
        }
    }


    async getRecommendations(userId:string,limit=12){
        const items=await this.prismaService.wishlistItem.findMany({
            where:{userId},
            select:{
                productId:true,
                product:{select:{categoryId:true, brandId:true}}
            }
        });

        if(items.length===0){
            return new BadRequestException("Please add items into wishlist first.");
        }

        const excludeIds=items.map((i)=>i.productId);

        const categoryIds=Array.from(new Set(items.map((i)=>i.product.categoryId)));
        const brandIds=Array.from(new Set(items.map((i)=>i.product.brandId)));

        const candidates=await this.prismaService.product.findMany({
            where:{
                isActive:true,
                id:{notIn:excludeIds},
                OR:[
                    {categoryId:{in:categoryIds}},
                    {brandId:{in:brandIds}}
                ]
            },
            orderBy:[{rating:"desc"},{createdAt:"asc"}],
            take:limit,
            select:{
                id:true,
                name:true,
                description:true,
                slug:true,
                price:true,
                salePrice:true,
                onSale:true,
                images:true,
                badge:true,
                freeShipping:true,
                rating:true,
                reviewCount:true,
                createdAt:true,
                stock:true,
                categoryId:true,
                brandId:true,
                variants:{
                    select:{isActive:true, priceOverride:true,stockOverride:true}
                }
            }
        });

        const activeOffers=await this.offersService.getActiveOffersForResolution();
        const decorated=candidates.map((p)=>attachOfferInfo(withComputedIsNew(withEffectivePrice(withEffectiveStock(p))),activeOffers));

        return{
            message:"Recommendations fetched successfully",
            data:decorated
        }
    }
}
