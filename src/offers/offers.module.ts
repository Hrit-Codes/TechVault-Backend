import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports:[CloudinaryModule],
  controllers: [OffersController],
  providers: [OffersService],
  exports:[OffersService]
})
export class OffersModule {}
