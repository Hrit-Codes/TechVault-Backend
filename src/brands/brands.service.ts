import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─── PUBLIC ────────────────────────────────────────────────
  async getActiveBrands() {
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, logo: true, slug: true },
    });

    return {
      message: 'Active brands fetched successfully',
      data: brands,
    };
  }

  async getBrandBySlug(slug: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { slug },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    return {
      message: 'Brand fetched successfully',
      data: brand,
    };
  }

  // ─── ADMIN ────────────────────────────────────────────────
  async getAllBrands() {
    const brands = await this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
    });

    return {
      message: 'Brands fetched successfully',
      data: brands,
    };
  }

  async createBrand(dto: CreateBrandDto, file?: Express.Multer.File) {
    const existingName = await this.prisma.brand.findFirst({
      where: {
        name: {
          equals: dto.name,
          mode: 'insensitive',
        },
      },
    });
    if (existingName) throw new ConflictException('Brand name already exists');

    const slug = dto.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    let logoUrl: string | undefined;
    if (file) {
      const result = await this.cloudinaryService.uploadImage(file, 'techvault/brands');
      logoUrl = result.secure_url;
    }

    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name,
        slug,
        logo: logoUrl,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      message: 'Brand created successfully',
      data: brand,
    };
  }

  async updateBrand(id: string, dto: UpdateBrandDto, file?: Express.Multer.File) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');

    if (dto.name && dto.name !== brand.name) {
      const existingName = await this.prisma.brand.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (existingName) throw new ConflictException('Brand name already exists');
    }

    let slug = brand.slug;
    if (dto.name) {
      slug = dto.name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    }

    let logoUrl = brand.logo;
    if (file) {
      if (brand.logo) {
        const publicId = brand.logo.split('/').pop()?.split('.')[0];
        if (publicId) {
          await this.cloudinaryService.deleteImage(`techvault/brands/${publicId}`);
        }
      }
      const result = await this.cloudinaryService.uploadImage(file, 'techvault/brands');
      logoUrl = result.secure_url;
    }

    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        logo: logoUrl,
        slug,
      },
    });

    return {
      message: 'Brand updated successfully',
      data: updatedBrand,
    };
  }

  async deleteBrand(id: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    if (brand.logo) {
      const publicId = brand.logo.split('/').pop()?.split('.')[0];
      if (publicId) {
        await this.cloudinaryService.deleteImage(`techvault/brands/${publicId}`);
      }
    }

    await this.prisma.brand.delete({ where: { id } });
  }

  async toggleBrandStatus(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    const updatedBrand = await this.prisma.brand.update({
      where: { id },
      data: { isActive: !brand.isActive },
    });

    return {
      message: `Brand ${updatedBrand.isActive ? 'Activated' : 'Deactivated'} successfully`,
      data: updatedBrand,
    };
  }
}