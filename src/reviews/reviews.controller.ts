import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { QueryReviewDto } from './dto/query-review.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
    constructor(
        private readonly reviewsService:ReviewsService
    ){}

    @Get('product/:productId')
    @HttpCode(HttpStatus.OK)
    async getProductReviews(
        @Param("productId") productId:string,
        @Query() query:QueryReviewDto
    ){
        return this.reviewsService.getProductReview(productId,query)
    }

    @Post('product/:productId')
    @UseGuards(JwtGuard)
    @HttpCode(HttpStatus.CREATED)
    async createReviews(
        @Param('productId') productId:string,
        @Body() dto:CreateReviewDto,
        @GetUser('fullName') username:string,
    ){
        return this.reviewsService.createReview(productId,username,dto)
    }

    @Delete(":id")
    @UseGuards(JwtGuard,RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async deleteReview(
        @Param("id") id:string
    ){
        return this.reviewsService.deleteReview(id)
    }
}
