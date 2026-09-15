import { Module } from '@nestjs/common';
import { HeroSectionsService } from './hero-sections.service';
import { HeroSectionsController } from './hero-sections.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RedisService } from '../redis/redis.service';

@Module({
  imports:[CloudinaryModule,RedisService],
  controllers: [HeroSectionsController],
  providers: [HeroSectionsService],
  exports:[HeroSectionsService]
})
export class HeroSectionsModule {}
