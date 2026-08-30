import { Module } from '@nestjs/common';
import { AboutUsController } from './about-us.controller';
import { AboutUsService } from './about-us.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
    imports: [CloudinaryModule],
    controllers: [AboutUsController],
    providers: [AboutUsService],
    exports: [AboutUsService],
})
export class AboutUsModule {}