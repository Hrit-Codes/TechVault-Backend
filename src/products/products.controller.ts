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
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { QueryProductDto } from './dto/query-product.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtGuard } from '../common/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../cloudinary/multer.config';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantsBulkDto } from './dto/create-variants-bulk.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productService: ProductsService) {}

  // ========== PUBLIC ==========
  @Get()
  @HttpCode(HttpStatus.OK)
  async getProducts(@Query() query: QueryProductDto) {
    return this.productService.getProducts(query);
  }

  // ========== ADMIN ==========
  @Get('admin/all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAllProducts(@Query() query: QueryProductDto) {
    return this.productService.getAllProducts(query);
  }

  @Get('admin/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  // ========== ADMIN ==========
  @Post(':id/variants')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createVariant(
    @Param('id') id: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productService.createVariant(id, dto);
  }

  @Post(':id/variants/bulk')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createVariantsBulk(
    @Param('id') id: string,
    @Body() dto: CreateVariantsBulkDto,
  ) {
    return this.productService.createVariantsBulk(id, dto);
  }

  @Patch(':id/variants/:variantId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productService.updateVariant(id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    await this.productService.deleteVariant(id, variantId);
  }

  // ========== ADMIN ==========
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('images', 10, multerConfig))
  async createProduct(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productService.createProduct(dto, files);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('images', 10, multerConfig))
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productService.updateProduct(id, dto, files);
  }

  @Patch(':id/status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleProductStatus(@Param('id') id: string) {
    return this.productService.toggleProductStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id') id: string) {
    await this.productService.deleteProduct(id);
  }

  // ========== PUBLIC ==========
  @Get(':id/variants')
  @HttpCode(HttpStatus.OK)
  async getVariants(@Param('id') id: string) {
    return this.productService.getVariants(id);
  }

  // ========== PUBLIC  ==========
  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  async getProductBySlug(@Param('slug') slug: string) {
    return this.productService.getProductBySlug(slug);
  }
}