import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RedisService } from '../redis/redis.service';

@Module({
  imports:[CloudinaryModule, RedisService],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports:[BrandsService]
})
export class BrandsModule {}
