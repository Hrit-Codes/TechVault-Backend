import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { OffersModule } from '../offers/offers.module';
import { RedisService } from '../redis/redis.service';

@Module({
  imports:[CloudinaryModule,OffersModule,RedisService],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports:[ProductsService]
})
export class ProductsModule {}
