import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('wishlist')
export class WishlistController {
    constructor(
        private readonly wishlistService:WishlistService
    ){}

    @Get()
    @UseGuards(JwtGuard)
    @HttpCode(HttpStatus.OK)
    async getWishlist(
        @GetUser("id") userId:string
    ){
        return this.wishlistService.getWishlist(userId);
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
    @HttpCode(HttpStatus.OK)
    async removeFromWishlist(
        @GetUser("id") userId:string,
        @Param("productId") productId:string,
    ){
        return this.wishlistService.removeFromWishlist(userId,productId);
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    async clearWishlist(
        @GetUser("id") userId:string,
    ){
        return this.wishlistService.clearWishlist(userId)
    }


}
