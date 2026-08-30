import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { AboutUsService } from './about-us.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtGuard } from '../common/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../cloudinary/multer.config';
import { CreateFaqItemDto, CreatePromiseItemDto, UpdateFaqItemDto, UpdatePromiseItemDto, UpsertAboutUsStoryDto } from './dto/aboutUs.dto';


@Controller('about-us')
export class AboutUsController {
    constructor(private readonly aboutUsService: AboutUsService) {}

    // ============ Public ============

    @Get("story")
    @HttpCode(HttpStatus.OK)
    async getStory() {
        return this.aboutUsService.getStory();
    }

    @Get("promises")
    @HttpCode(HttpStatus.OK)
    async getPromiseItems() {
        return this.aboutUsService.getPromiseItems();
    }

    @Get("faqs")
    @HttpCode(HttpStatus.OK)
    async getFaqItems() {
        return this.aboutUsService.getFaqItems();
    }

    // ============ Admin — Story ============

    @Patch("admin/story")
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor("image", multerConfig))
    async upsertStory(
        @Body() dto: UpsertAboutUsStoryDto,
        @UploadedFile() imageFile?: Express.Multer.File,
    ) {
        return this.aboutUsService.upsertStory(dto, imageFile);
    }


    @Post("admin/promises")
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    async createPromiseItem(@Body() dto: CreatePromiseItemDto) {
        return this.aboutUsService.createPromiseItem(dto);
    }

    @Patch("admin/promises/:id")
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async updatePromiseItem(@Param("id") id: string, @Body() dto: UpdatePromiseItemDto) {
        return this.aboutUsService.updatePromiseItem(id, dto);
    }

    @Delete("admin/promises/:id")
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async deletePromiseItem(@Param("id") id: string) {
        return this.aboutUsService.deletePromiseItem(id);
    }

    // ============ Admin — FAQ Items ============

    @Post("admin/faqs")
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    async createFaqItem(@Body() dto: CreateFaqItemDto) {
        return this.aboutUsService.createFaqItem(dto);
    }

    @Patch("admin/faqs/:id")
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async updateFaqItem(@Param("id") id: string, @Body() dto: UpdateFaqItemDto) {
        return this.aboutUsService.updateFaqItem(id, dto);
    }

    @Delete("admin/faqs/:id")
    @UseGuards(JwtGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async deleteFaqItem(@Param("id") id: string) {
        return this.aboutUsService.deleteFaqItem(id);
    }
}