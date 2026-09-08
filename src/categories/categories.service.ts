import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─── PUBLIC ────────────────────────────────────────────────
  async getActiveCategories() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        subtitle: true,
        image: true,
        slug: true,
      },
    });

    return {
      message: 'Active categories fetched successfully',
      data: categories,
    };
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (!category) throw new NotFoundException('Category not found');

    return {
      message: 'Category fetched successfully',
      data: category,
    };
  }

  // ─── ADMIN ────────────────────────────────────────────────
  async getAllCategories() {
    const categories = await this.prisma.category.findMany({
      orderBy: { order: 'asc' },
    });

    return {
      message: 'Categories fetched successfully',
      data: categories,
    };
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Category not found');

    return {
      message: 'Category fetched successfully',
      data: category,
    };
  }

  async createCategory(dto: CreateCategoryDto, file?: Express.Multer.File) {
    const existingName = await this.prisma.category.findFirst({
      where: {
        name: {
          equals: dto.name,
          mode: 'insensitive',
        },
      },
    });
    if (existingName) throw new ConflictException('Category name already exists');

    const slug = dto.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (!file) throw new BadRequestException('Category image is required');

    const result = await this.cloudinaryService.uploadImage(file, 'techvault/categories');
    const imageUrl = result.secure_url;

    if (dto.order) {
      await this.prisma.category.updateMany({
        where: { order: { gte: dto.order } },
        data: { order: { increment: 1 } },
      });
    } else {
      const lastCategory = await this.prisma.category.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      dto.order = (lastCategory?.order || 0) + 1;
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        subtitle: dto.subtitle,
        slug,
        image: imageUrl,
        isActive: dto.isActive ?? true,
        order: dto.order,
      },
    });

    return {
      message: 'Category created successfully',
      data: category,
    };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, file?: Express.Multer.File) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (dto.name && dto.name !== category.name) {
      const existingName = await this.prisma.category.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (existingName) throw new ConflictException('Category name already exists');
    }

    let slug = category.slug;
    if (dto.name) {
      slug = dto.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    let imageUrl = category.image;
    if (file) {
      if (category.image) {
        const publicId = category.image.split('/').pop()?.split('.')[0];
        if (publicId) {
          await this.cloudinaryService.deleteImage(`techvault/categories/${publicId}`);
        }
      }
      const result = await this.cloudinaryService.uploadImage(file, 'techvault/categories');
      imageUrl = result.secure_url;
    }

    if (dto.order && dto.order !== category.order) {
      if (dto.order > category.order) {
        await this.prisma.category.updateMany({
          where: {
            order: { gt: category.order, lte: dto.order },
            NOT: { id },
          },
          data: { order: { decrement: 1 } },
        });
      } else {
        await this.prisma.category.updateMany({
          where: {
            order: { gte: dto.order, lt: category.order },
            NOT: { id },
          },
          data: { order: { increment: 1 } },
        });
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.subtitle !== undefined && { subtitle: dto.subtitle }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.order !== undefined && { order: dto.order }),
        slug,
        image: imageUrl,
      },
    });

    return {
      message: 'Category updated successfully',
      data: updatedCategory,
    };
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    if (category.image) {
      const publicId = category.image.split('/').pop()?.split('.')[0];
      if (publicId) {
        await this.cloudinaryService.deleteImage(`techvault/categories/${publicId}`);
      }
    }

    await this.prisma.category.delete({ where: { id } });
  }

  async toggleCategoryStatus(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });

    return {
      message: `Category ${updatedCategory.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedCategory,
    };
  }
}