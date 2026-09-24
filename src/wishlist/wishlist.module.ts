import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { OffersModule } from '../offers/offers.module';

@Module({
  imports:[OffersModule],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports:[WishlistService],
})
export class WishlistModule {}
