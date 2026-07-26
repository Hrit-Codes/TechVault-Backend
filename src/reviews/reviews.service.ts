import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';

@Injectable()
export class ReviewsService {
    constructor(
        private readonly prisma:PrismaService
    ){}

    // Public
    async getProductReview(productId:string, query:QueryReviewDto){
        const {page=1, limit=12}=query;

        const product=await this.prisma.product.findUnique({
            where:{id:productId}
        })

        if(!product) throw new NotFoundException("Product not found");

        const skip=(page-1)*limit;

        const [total,reviews]=await Promise.all([
            this.prisma.review.count({
                where:{productId}
            }),
            this.prisma.review.findMany({
                where:{productId},
                skip,
                take:limit,
                orderBy:{createdAt:"asc"}
            })
        ]);

        return {
            message:"Reviews fetched successfully",
            reviews,
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

    async createReview(productId:string, userName:string, dto:CreateReviewDto){
        const product=await this.prisma.product.findUnique({
            where:{id:productId}
        });
        if(!product) throw new NotFoundException("Product not found");

        const review=await this.prisma.review.create({
            data:{
                name:userName,
                rating:dto.rating,
                text:dto.text,
                productId,
            }
        });

        const newReviewCount=product.reviewCount+1;
        const newRating=((product.rating*product.reviewCount)+dto.rating)/newReviewCount;

        await this.prisma.product.update({
            where:{id:productId},
            data:{
                rating:Number(newRating.toFixed(1)),
                reviewCount:newReviewCount
            }
        })

        return {
            message:"Review created successfully",
            review
        }
    }


    async deleteReview(id:string){
        const review=await this.prisma.review.findUnique({
            where:{id}
        })

        if(!review) throw new NotFoundException("Review not found");

        await this.prisma.review.delete({
            where:{id}
        })

        const remainingReviews=await this.prisma.review.findMany({
            where:{productId:review.productId},
            select:{rating:true}
        })

        const newReviewCount=remainingReviews.length;
        const newRating=remainingReviews.length>0?remainingReviews.reduce((sum,r)=>sum+r.rating,0)/newReviewCount:0;

        await this.prisma.product.update({
            where:{id:review.productId},
            data:{
                rating:Number(newRating.toFixed(1)),
                reviewCount:newReviewCount
            }
        })

        return {
            message:"Product review deleted successfully",
            id:review.id
        }
    }



}
