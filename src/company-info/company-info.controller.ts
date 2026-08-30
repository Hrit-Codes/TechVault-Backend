import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CompanyInfoService } from './company-info.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateCompanyInfoDto } from './dto/create-companyInfo.dto';
import { UpdateCompanyInfoDto } from './dto/update-companyInfo.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../cloudinary/multer.config';

@Controller('company-info')
export class CompanyInfoController {
  constructor(
    private readonly companyInfoService: CompanyInfoService) {
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getCompanyInfo(){
    return this.companyInfoService.getCompanyInfo();
  }

  @Post()
  @UseGuards(JwtGuard,RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("logo",multerConfig))
  async createCompanyInfo(
    @Body() dto:CreateCompanyInfoDto,
    @UploadedFile() logoFile:Express.Multer.File
  ){
    return this.companyInfoService.createCompanyInfo(dto,logoFile);
  }

  @Patch()
  @UseGuards(JwtGuard,RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor("logo",multerConfig))
  async updateCompanyInfo(
    @Body() dto:UpdateCompanyInfoDto,
    @UploadedFile() logoFile?:Express.Multer.File
  ){
    return this.companyInfoService.updateCompanyInfo(dto, logoFile);
  }

  @Delete()
  @UseGuards(JwtGuard,RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteCompanyInfo(){
    await this.companyInfoService.deleteCompanyInfo();
  }

}
