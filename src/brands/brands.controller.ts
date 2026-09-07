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
import { BrandsService } from './brands.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../cloudinary/multer.config';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  // ========== PUBLIC ==========
  @Get()
  @HttpCode(HttpStatus.OK)
  async getActiveBrands() {
    return this.brandsService.getActiveBrands();
  }

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  async getBrandBySlug(@Param('slug') slug: string) {
    return this.brandsService.getBrandBySlug(slug);
  }

  // ========== ADMIN ==========
  @Get('admin/all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAllBrands() {
    return this.brandsService.getAllBrands();
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('logo', multerConfig))
  async createBrand(
    @Body() dto: CreateBrandDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.brandsService.createBrand(dto, file);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('logo', multerConfig))
  async updateBrand(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.brandsService.updateBrand(id, dto, file);
  }

  @Patch(':id/status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleStatus(@Param('id') id: string) {
    return this.brandsService.toggleBrandStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBrand(@Param('id') id: string) {
    await this.brandsService.deleteBrand(id);
  }
}