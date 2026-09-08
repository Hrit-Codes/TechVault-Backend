import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { OffersModule } from '../offers/offers.module';

@Module({
  imports:[CloudinaryModule,OffersModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports:[ProductsService]
})
export class ProductsModule {}
