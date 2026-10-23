import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PromotionalBanner, Prisma } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { CreatePromotionalBannerDto } from './dto/create-promotional-banner.dto';
import { UpdatePromotionalBannerDto } from './dto/update-promotional-banner.dto';

const PROMOTIONAL_BANNERS_CACHE_KEY = 'promotional-banners:all';
const PROMOTIONAL_BANNERS_ACTIVE_CACHE_KEY = 'promotional-banners:active';
const PROMOTIONAL_BANNERS_CACHE_TTL = 30 * 60;
const MIN_PROMOTIONAL_BANNERS = 2;
const MAX_PROMOTIONAL_BANNERS = 5;

@Injectable()
export class PromotionalBannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly redisService: RedisService,
  ) {}

  private async clearPromotionalBannersCache(id?: string) {
    const keysToDelete = [
      PROMOTIONAL_BANNERS_CACHE_KEY,
      PROMOTIONAL_BANNERS_ACTIVE_CACHE_KEY,
    ];
    if (id) {
      keysToDelete.push(`promotional-banners:id:${id}`);
    }
    await this.redisService.del(...keysToDelete);
  }

  private normalizeLinkUrl(linkUrl?: string | null): string | null {
    const trimmed = linkUrl?.trim();
    return trimmed ? trimmed : null;
  }

  // ─── PUBLIC ────────────────────────────────────────────────
  async getActivePromotionalBanners() {
    const cached = await this.redisService.get<PromotionalBanner[]>(
      PROMOTIONAL_BANNERS_ACTIVE_CACHE_KEY,
    );

    let banners = cached;
    if (!banners) {
      banners = await this.prisma.promotionalBanner.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });
      await this.redisService.set(
        PROMOTIONAL_BANNERS_ACTIVE_CACHE_KEY,
        banners,
        PROMOTIONAL_BANNERS_CACHE_TTL,
      );
    }

    return {
      message: 'Active promotional banners fetched successfully',
      data: banners,
    };
  }

  // ─── ADMIN ────────────────────────────────────────────────
  async getAllPromotionalBanners() {
    const cached = await this.redisService.get<PromotionalBanner[]>(
      PROMOTIONAL_BANNERS_CACHE_KEY,
    );
    if (cached) {
      return {
        message: 'All promotional banners fetched successfully',
        data: cached,
      };
    }

    const banners = await this.prisma.promotionalBanner.findMany({
      orderBy: { order: 'asc' },
    });

    await this.redisService.set(
      PROMOTIONAL_BANNERS_CACHE_KEY,
      banners,
      PROMOTIONAL_BANNERS_CACHE_TTL,
    );

    return {
      message: 'All promotional banners fetched successfully',
      data: banners,
    };
  }

  async getPromotionalBannerById(id: string) {
    const cached = await this.redisService.get<PromotionalBanner>(
      `promotional-banners:id:${id}`,
    );
    if (cached) {
      return {
        message: 'Promotional banner fetched successfully',
        data: cached,
      };
    }

    const banner = await this.prisma.promotionalBanner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Promotional banner not found');
    }

    await this.redisService.set(
      `promotional-banners:id:${id}`,
      banner,
      PROMOTIONAL_BANNERS_CACHE_TTL,
    );

    return {
      message: 'Promotional banner fetched successfully',
      data: banner,
    };
  }

  async createPromotionalBanner(
    dto: CreatePromotionalBannerDto,
    imageFile: Express.Multer.File,
  ) {
    if (!imageFile) {
      throw new BadRequestException(
        'A banner image is required for a promotional banner',
      );
    }

    if (!dto.title?.trim()) {
      throw new BadRequestException('Banner title is required');
    }

    const count = await this.prisma.promotionalBanner.count();
    if (count >= MAX_PROMOTIONAL_BANNERS) {
      throw new BadRequestException(
        `You can have at most ${MAX_PROMOTIONAL_BANNERS} promotional banners`,
      );
    }

    let order: number;
    if (dto.order === undefined) {
      const lastBanner = await this.prisma.promotionalBanner.findFirst({
        orderBy: { order: 'desc' },
      });
      order = lastBanner ? lastBanner.order + 1 : 0;
    } else {
      order = dto.order;
    }

    const uploaded = await this.cloudinaryService.uploadImage(
      imageFile,
      'techvault/promotional-banners',
    );

    const banner = await this.prisma.$transaction(async (tx) => {
      await tx.promotionalBanner.updateMany({
        where: { order: { gte: order } },
        data: { order: { increment: 1 } },
      });

      return tx.promotionalBanner.create({
        data: {
          title: dto.title.trim(),
          imageUrl: uploaded.secure_url,
          imagePublicId: uploaded.public_id,
          linkUrl: this.normalizeLinkUrl(dto.linkUrl),
          isActive: dto.isActive ?? true,
          order,
        },
      });
    });

    await this.clearPromotionalBannersCache();

    return {
      message: 'Promotional banner created successfully',
      data: banner,
    };
  }

  async updatePromotionalBanner(
    id: string,
    dto: UpdatePromotionalBannerDto,
    imageFile?: Express.Multer.File,
  ) {
    const existing = await this.prisma.promotionalBanner.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Promotional banner not found');
    }

    if (dto.title !== undefined && !dto.title.trim()) {
      throw new BadRequestException('Banner title is required');
    }

    let imageUrl = existing.imageUrl;
    let imagePublicId = existing.imagePublicId;

    if (imageFile) {
      if (existing.imagePublicId) {
        await this.cloudinaryService.deleteImage(existing.imagePublicId);
      }
      const uploaded = await this.cloudinaryService.uploadImage(
        imageFile,
        'techvault/promotional-banners',
      );
      imageUrl = uploaded.secure_url;
      imagePublicId = uploaded.public_id;
    }

    const updateData: Prisma.PromotionalBannerUpdateInput = {
      imageUrl,
      imagePublicId,
    };

    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.linkUrl !== undefined) {
      updateData.linkUrl = this.normalizeLinkUrl(dto.linkUrl);
    }
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.order !== undefined) updateData.order = dto.order;

    const banner = await this.prisma.$transaction(async (tx) => {
      if (dto.order !== undefined && dto.order !== existing.order) {
        if (dto.order < existing.order) {
          await tx.promotionalBanner.updateMany({
            where: {
              id: { not: id },
              order: { gte: dto.order, lt: existing.order },
            },
            data: { order: { increment: 1 } },
          });
        } else {
          await tx.promotionalBanner.updateMany({
            where: {
              id: { not: id },
              order: { gt: existing.order, lte: dto.order },
            },
            data: { order: { decrement: 1 } },
          });
        }
      }

      return tx.promotionalBanner.update({
        where: { id },
        data: updateData,
      });
    });

    await this.clearPromotionalBannersCache(banner.id);

    return {
      message: 'Promotional banner updated successfully',
      data: banner,
    };
  }

  async togglePromotionalBanner(id: string) {
    const banner = await this.prisma.promotionalBanner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Promotional banner not found');
    }

    const updated = await this.prisma.promotionalBanner.update({
      where: { id },
      data: { isActive: !banner.isActive },
    });

    await this.clearPromotionalBannersCache(updated.id);

    return {
      message: `Promotional banner ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    };
  }

  async deletePromotionalBanner(id: string): Promise<void> {
    const banner = await this.prisma.promotionalBanner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Promotional banner not found');
    }

    const count = await this.prisma.promotionalBanner.count();
    if (count <= MIN_PROMOTIONAL_BANNERS) {
      throw new BadRequestException(
        `You must keep at least ${MIN_PROMOTIONAL_BANNERS} promotional banners`,
      );
    }

    if (banner.imagePublicId) {
      await this.cloudinaryService.deleteImage(banner.imagePublicId);
    }

    await this.prisma.promotionalBanner.delete({
      where: { id },
    });

    await this.clearPromotionalBannersCache(banner.id);
  }
}
