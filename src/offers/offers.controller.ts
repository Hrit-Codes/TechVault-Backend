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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../cloudinary/multer.config';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { QueryOfferDto } from './dto/query-offer.dto';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // ========== PUBLIC ==========
  @Get()
  @HttpCode(HttpStatus.OK)
  async getActiveOffers(@Query() query: QueryOfferDto) {
    return this.offersService.getActiveOffers(query);
  }

  // ========== ADMIN ==========
  @Get('admin/all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAllOffers(@Query() query: QueryOfferDto) {
    return this.offersService.getAllOffers(query);
  }

  
  @Get('admin/stats')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getOfferStats() {
    return this.offersService.getOfferStats();
  }

  @Get('admin/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getOfferById(@Param('id') id: string) {
    return this.offersService.getOfferById(id);
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('bannerImage', multerConfig))
  async createOffer(
    @Body() dto: CreateOfferDto,
    @UploadedFile() bannerFile: Express.Multer.File,
  ) {
    return this.offersService.createOffer(dto, bannerFile);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('bannerImage', multerConfig))
  async updateOffer(
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
    @UploadedFile() bannerFile: Express.Multer.File,
  ) {
    return this.offersService.updateOffer(id, dto, bannerFile);
  }

  @Patch(':id/status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleOffer(@Param('id') id: string) {
    return this.offersService.toggleOfferActive(id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOffer(@Param('id') id: string) {
    await this.offersService.deleteOffer(id);
  }
}