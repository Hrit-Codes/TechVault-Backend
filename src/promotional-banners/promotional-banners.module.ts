import { Module } from '@nestjs/common';
import { PromotionalBannersService } from './promotional-banners.service';
import { PromotionalBannersController } from './promotional-banners.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [PromotionalBannersController],
  providers: [PromotionalBannersService],
  exports: [PromotionalBannersService],
})
export class PromotionalBannersModule {}
