import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { GetWishlistDto } from './dto/get-wishlist.dto';

@Controller('wishlist')
@UseGuards(JwtGuard)
export class WishlistController {
    constructor(
        private readonly wishlistService:WishlistService
    ){}

    @Get()
    @HttpCode(HttpStatus.OK)
    async getWishlist(
        @GetUser("id") userId:string,
        @Query() query:GetWishlistDto,
    ){
        return this.wishlistService.getWishlist(userId,query);
    }

    @Post(":productId")
    @HttpCode(HttpStatus.CREATED)
    async addToWishlist(
        @GetUser("id") userId:string,
        @Param("productId") productId:string
    ){
        return this.wishlistService.addToWishlist(userId,productId)
    }

    @Delete(":productId")
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeFromWishlist(
        @GetUser("id") userId:string,
        @Param("productId") productId:string,
    ){
        return this.wishlistService.removeFromWishlist(userId,productId);
    }

    @Delete()
    @HttpCode(HttpStatus.NO_CONTENT)
    async clearWishlist(
        @GetUser("id") userId:string,
    ){
        return this.wishlistService.clearWishlist(userId)
    }


}
