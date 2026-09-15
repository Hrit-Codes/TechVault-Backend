import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RedisService } from '../redis/redis.service';

@Module({
  imports:[CloudinaryModule, RedisService],
  controllers:[CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService]
})
export class CategoriesModule {}
