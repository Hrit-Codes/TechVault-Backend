import { Module } from '@nestjs/common';
import { HeroSectionsService } from './hero-sections.service';
import { HeroSectionsController } from './hero-sections.controller';

@Module({
  controllers: [HeroSectionsController],
  providers: [HeroSectionsService],
})
export class HeroSectionsModule {}
