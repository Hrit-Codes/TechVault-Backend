import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../cloudinary/multer.config';
import { Role } from '@prisma/client';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('categories')
export class CategoriesController {
    constructor(
        private readonly categoriesService:CategoriesService,
    ){}

    @Get()
    @HttpCode(HttpStatus.OK)
    async getActiveCategories(){
        return this.categoriesService.getActiveCategories();
    }

    @Get(":slug")
    @HttpCode(HttpStatus.OK)
    async getCategoryBySlug(@Param('slug') slug:string){
        return this.categoriesService.getCategoryBySlug(slug)
    }

    // Admin routes

    @Get('admin/all')
    @UseGuards(JwtGuard,RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async getAllCategories(){
        return this.categoriesService.getAllCategories()
    }

    @Post()
    @UseGuards(JwtGuard,RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('image',multerConfig))
    async createCategory(
        @Body() dto:CreateCategoryDto,
        @UploadedFile() file:Express.Multer.File
    ){
        return this.categoriesService.createCategory(dto,file);
    }

    @Patch(':id')
    @UseGuards(JwtGuard,RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('image',multerConfig))
    async updateCategory(
        @Param('id') id:string,
        @Body() dto:UpdateCategoryDto,
        @UploadedFile() file:Express.Multer.File
    ){
        return this.categoriesService.updateCategory(id,dto,file)
    }

    @Delete(':id')
    @UseGuards(JwtGuard,RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async deleteCategory(@Param('id') id:string){
        return this.categoriesService.deleteCategory(id);
    }

    @Patch(':id/status')
    @UseGuards(JwtGuard,RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async toggleStatus(@Param('id') id:string){
        return this.categoriesService.toggleCategoryStatus(id)
    }

}
