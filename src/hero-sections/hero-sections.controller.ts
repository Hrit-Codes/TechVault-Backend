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
import { HeroSectionsService } from './hero-sections.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateHeroSectionDto } from './dto/create-hero-section.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../cloudinary/multer.config';
import { UpdateHeroSectionDto } from './dto/update-hero-section.dto';

@Controller('hero-sections')
export class HeroSectionsController {
  constructor(private readonly heroSectionsService: HeroSectionsService) {}

  // ========== PUBLIC ==========
  @Get()
  @HttpCode(HttpStatus.OK)
  async getActiveHeroSections() {
    return this.heroSectionsService.getActiveHeroSections();
  }

  // ========== ADMIN ==========
  @Get('admin/all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAllHeroSections() {
    return this.heroSectionsService.getAllHeroSections();
  }

  @Get('admin/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getHeroSectionById(@Param('id') id: string) {
    return this.heroSectionsService.getHeroSectionById(id);
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async createHeroSection(
    @Body() dto: CreateHeroSectionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.heroSectionsService.createHeroSection(dto, file);
  }

  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async updateHeroSection(
    @Param('id') id: string,
    @Body() dto: UpdateHeroSectionDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.heroSectionsService.updateHeroSection(id, dto, file);
  }

  @Patch(':id/status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleHeroSection(@Param('id') id: string) {
    return this.heroSectionsService.toggleHeroSection(id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHeroSection(@Param('id') id: string) {
    await this.heroSectionsService.deleteHeroSection(id);
  }
}