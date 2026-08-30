import { Module } from '@nestjs/common';
import { CompanyInfoService } from './company-info.service';
import { CompanyInfoController } from './company-info.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports:[CloudinaryModule],
  controllers: [CompanyInfoController],
  providers: [CompanyInfoService],
  exports:[CompanyInfoService]
})
export class CompanyInfoModule {}
