import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateHeroSectionDto } from './dto/create-hero-section.dto';
import { TextAlignment } from '@prisma/client';
import { UpdateHeroSectionDto } from './dto/update-hero-section.dto';
import { RedisService } from '../redis/redis.service';

const HEROS_CACHE_KEY="heros:all";
const HEROS_ACTIVE_CACHE_KEY="heros:active";
const HEROS_CACHE_TTL=30*60;

@Injectable()
export class HeroSectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly redisService:RedisService
  ) {}

  private async clearHerosCache(id?:string){
    const keysToDelete=[HEROS_CACHE_KEY,HEROS_ACTIVE_CACHE_KEY];
    if(id){
      keysToDelete.push(`heros:id:${id}`);
    }
    await this.redisService.del(...keysToDelete);
  }

  private extractPublicId(url: string, folder: string): string | null {
    const filename = url.split('/').pop()?.split('.')[0];
    return filename ? `${folder}/${filename}` : null;
  }

  // ─── PUBLIC ────────────────────────────────────────────────
  async getActiveHeroSections() {
    const cached=await this.redisService.get<any>(HEROS_ACTIVE_CACHE_KEY);
    let sections=cached;
    if(!sections){
      sections =await this.prisma.heroSection.findMany({
        where:{isActive:true},
        orderBy:{order:"asc"}
      });
      await this.redisService.set(HEROS_ACTIVE_CACHE_KEY,sections,HEROS_CACHE_TTL);
    }

    const offerIds = sections.map((s: any) => s.linkedOfferId).filter(Boolean);
    const offers = offerIds.length
      ? await this.prisma.offer.findMany({ where: { id: { in: offerIds } } })
      : [];
    const offerMap = new Map(offers.map((o) => [o.id, o]));

    const enriched = sections.map((s: any) => ({
      ...s,
      linkedOffer: s.linkedOfferId ? offerMap.get(s.linkedOfferId) ?? null : null,
    }));

    return {
      message: 'Active hero sections fetched successfully',
      data: enriched,
    };
  }

  // ─── ADMIN ────────────────────────────────────────────────
  async getAllHeroSections() {
    const cached=await this.redisService.get<any>(HEROS_CACHE_KEY);
    if(cached){
      return{
         message:"All hero sections fetched successfully",
         data:cached
      }
    }
    const sections = await this.prisma.heroSection.findMany({
      orderBy: { order: 'asc' },
      include: {
        linkedOffer: true,
      },
    });

    await this.redisService.set(HEROS_CACHE_KEY,sections,HEROS_CACHE_TTL);

    return {
      message: 'All hero sections fetched successfully',
      data: sections,
    };
  }

  async getHeroSectionById(id: string) {
    const cached=await this.redisService.get(`heros:id:${id}`);
    if(cached){
      return{
        message:"Hero section fetched successfully",
        data:cached
      }
    }
    const section = await this.prisma.heroSection.findUnique({
      where: { id },
      include: {
        linkedOffer: true,
      },
    });

    if (!section) {
      throw new NotFoundException('Hero section not found');
    }

    await this.redisService.set(`heros:id:${id}`,section,HEROS_CACHE_TTL);

    return {
      message: 'Hero section fetched successfully',
      data: section,
    };
  }

  async createHeroSection(dto: CreateHeroSectionDto, mediaFile: Express.Multer.File) {
    if (!mediaFile) {
      throw new BadRequestException('A media file (image) is required for a hero section');
    }

    if (dto.linkedOfferId) {
      const offer = await this.prisma.offer.findUnique({
        where: { id: dto.linkedOfferId },
      });
      if (!offer) {
        throw new BadRequestException('Linked offer does not exist');
      }
    }

    // Validate button pairs
    if (
      (!dto.primaryButtonText && dto.primaryButtonLink) ||
      (dto.primaryButtonText && !dto.primaryButtonLink)
    ) {
      throw new BadRequestException('Primary button requires both link and text');
    }

    if (
      (!dto.secondaryButtonText && dto.secondaryButtonLink) ||
      (dto.secondaryButtonText && !dto.secondaryButtonLink)
    ) {
      throw new BadRequestException('Secondary button requires both link and text');
    }

    const uploaded = await this.cloudinaryService.uploadImage(mediaFile, 'techvault/hero-sections');
    const mediaPublicId = uploaded.public_id;

    let order = dto.order;
    if (order === undefined) {
      const lastSection = await this.prisma.heroSection.findFirst({
        orderBy: { order: 'desc' },
      });
      order = lastSection ? lastSection.order + 1 : 0;
    }

    const section = await this.prisma.heroSection.create({
      data: {
        eyebrow: dto.eyebrow,
        headingLine1: dto.headingLine1,
        headingLine2: dto.headingLine2,
        description: dto.description,
        primaryButtonText: dto.primaryButtonText,
        primaryButtonLink: dto.primaryButtonLink,
        secondaryButtonText: dto.secondaryButtonText,
        secondaryButtonLink: dto.secondaryButtonLink,
        linkedOfferId: dto.linkedOfferId,
        mediaUrl: uploaded.secure_url,
        mediaPublicId: mediaPublicId,
        textAlignment: dto.textAlignment as TextAlignment,
        overlayColor: dto.overlayColor,
        overlayOpacity: dto.overlayOpacity,
        isActive: dto.isActive,
        order: order,
      },
      include: { linkedOffer: true },
    });

    await this.clearHerosCache();

    return {
      message: 'Hero section created successfully',
      data: section,
    };
  }

  async updateHeroSection(
    id: string,
    dto: UpdateHeroSectionDto,
    mediaFile?: Express.Multer.File,
  ) {
    const existing = await this.prisma.heroSection.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Hero section not found');
    }

    if (dto.linkedOfferId) {
      const offer = await this.prisma.offer.findUnique({
        where: { id: dto.linkedOfferId },
      });
      if (!offer) {
        throw new BadRequestException('Linked offer does not exist');
      }
    }

    // Validate button pairs
    if (
      (!dto.primaryButtonText && dto.primaryButtonLink) ||
      (dto.primaryButtonText && !dto.primaryButtonLink)
    ) {
      throw new BadRequestException('Primary button requires both link and text');
    }

    if (
      (!dto.secondaryButtonText && dto.secondaryButtonLink) ||
      (dto.secondaryButtonText && !dto.secondaryButtonLink)
    ) {
      throw new BadRequestException('Secondary button requires both link and text');
    }

    let mediaUrl = existing.mediaUrl;
    let mediaPublicId = existing.mediaPublicId;

    if (mediaFile) {
      if (existing.mediaPublicId) {
        await this.cloudinaryService.deleteImage(existing.mediaPublicId);
      }
      const uploaded = await this.cloudinaryService.uploadImage(mediaFile, 'techvault/hero-sections');
      mediaUrl = uploaded.secure_url;
      mediaPublicId = uploaded.public_id;
    }

    const updateData: any = {};

    if (dto.eyebrow !== undefined) updateData.eyebrow = dto.eyebrow;
    if (dto.headingLine1 !== undefined) updateData.headingLine1 = dto.headingLine1;
    if (dto.headingLine2 !== undefined) updateData.headingLine2 = dto.headingLine2;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.primaryButtonText !== undefined) updateData.primaryButtonText = dto.primaryButtonText;
    if (dto.primaryButtonLink !== undefined) updateData.primaryButtonLink = dto.primaryButtonLink;
    if (dto.secondaryButtonText !== undefined) updateData.secondaryButtonText = dto.secondaryButtonText;
    if (dto.secondaryButtonLink !== undefined) updateData.secondaryButtonLink = dto.secondaryButtonLink;
    if (dto.linkedOfferId !== undefined) updateData.linkedOfferId = dto.linkedOfferId;
    if (dto.textAlignment !== undefined) updateData.textAlignment = dto.textAlignment;
    if (dto.overlayColor !== undefined) updateData.overlayColor = dto.overlayColor;
    if (dto.overlayOpacity !== undefined) updateData.overlayOpacity = dto.overlayOpacity;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.order !== undefined) updateData.order = dto.order;

    updateData.mediaUrl = mediaUrl;
    updateData.mediaPublicId = mediaPublicId;

    const section = await this.prisma.heroSection.update({
      where: { id },
      data: updateData,
      include: { linkedOffer: true },
    });

    await this.clearHerosCache(section.id);

    return {
      message: 'Hero section updated successfully',
      data: section,
    };
  }

  async toggleHeroSection(id: string) {
    const section = await this.prisma.heroSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException('Hero section not found');
    }

    const updated = await this.prisma.heroSection.update({
      where: { id },
      data: { isActive: !section.isActive },
    });

    await this.clearHerosCache(updated.id);

    return {
      message: `Hero section ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    };
  }

  async deleteHeroSection(id: string): Promise<void> {
    const section = await this.prisma.heroSection.findUnique({
      where: { id },
    });

    if (!section) {
      throw new NotFoundException('Hero section not found');
    }

    if (section.mediaPublicId) {
      await this.cloudinaryService.deleteImage(section.mediaPublicId);
    }

    await this.prisma.heroSection.delete({
      where: { id },
    });

    await this.clearHerosCache(section.id);
  }
}