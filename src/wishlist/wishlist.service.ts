import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
    constructor(
        private readonly prismaService:PrismaService
    ){}

    async getWishlist(userId:string){
        const wishlist = this.prismaService.wishlistItem.findMany({
            where:{userId},
            select:{
                id:true,
                product:{
                    select:{
                        id:true,
                        name:true,
                        slug:true,
                        price:true,
                        salePrice:true,
                        onSale:true,
                        images:true
                    }
                },
                createdAt:true
            }
        })

        return{
            message:"Wishlist fetched successfully",
            wishlist
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
            message:{
                message:"Added to wishlist",
                wishlistItem
            }
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
}
