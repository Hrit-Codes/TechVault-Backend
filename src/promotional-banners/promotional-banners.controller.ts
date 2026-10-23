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
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';

import { PromotionalBannersService } from './promotional-banners.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { multerConfig } from '../cloudinary/multer.config';
import { CreatePromotionalBannerDto } from './dto/create-promotional-banner.dto';
import { UpdatePromotionalBannerDto } from './dto/update-promotional-banner.dto';

@Controller('promotional-banners')
export class PromotionalBannersController {
  constructor(
    private readonly promotionalBannersService: PromotionalBannersService,
  ) {}

  // ========== PUBLIC ==========
  @Get()
  @HttpCode(HttpStatus.OK)
  async getActivePromotionalBanners() {
    return this.promotionalBannersService.getActivePromotionalBanners();
  }

  // ========== ADMIN ==========
  @Get('admin/all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAllPromotionalBanners() {
    return this.promotionalBannersService.getAllPromotionalBanners();
  }

  @Get('admin/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getPromotionalBannerById(@Param('id') id: string) {
    return this.promotionalBannersService.getPromotionalBannerById(id);
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async createPromotionalBanner(
    @Body() dto: CreatePromotionalBannerDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    return this.promotionalBannersService.createPromotionalBanner(dto, image);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async updatePromotionalBanner(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionalBannerDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.promotionalBannersService.updatePromotionalBanner(
      id,
      dto,
      image,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async togglePromotionalBanner(@Param('id') id: string) {
    return this.promotionalBannersService.togglePromotionalBanner(id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePromotionalBanner(@Param('id') id: string) {
    await this.promotionalBannersService.deletePromotionalBanner(id);
  }
}
