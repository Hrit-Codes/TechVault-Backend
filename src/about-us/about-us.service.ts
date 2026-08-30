import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateFaqItemDto, CreatePromiseItemDto, UpdateFaqItemDto, UpdatePromiseItemDto, UpsertAboutUsStoryDto } from './dto/aboutUs.dto';

const MIN_PROMISE_ITEMS = 4;
const MAX_PROMISE_ITEMS = 8;
const MIN_FAQ_ITEMS = 4;
const MAX_FAQ_ITEMS = 8;

@Injectable()
export class AboutUsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    private extractPublicId(url: string, folder: string): string | null {
        const filename = url.split("/").pop()?.split(".")[0];
        return filename ? `${folder}/${filename}` : null;
    }

    async getStory() {
        const story = await this.prisma.aboutUsStory.findFirst();
        return { message: "About Us story fetched successfully", data: story };
    }

    async upsertStory(dto: UpsertAboutUsStoryDto, imageFile?: Express.Multer.File) {
        const existing = await this.prisma.aboutUsStory.findFirst();

        let image = existing?.image ?? null;
        let imagePublicId = existing?.imagePublicId ?? null;

        if (imageFile) {
            if (imagePublicId) {
                await this.cloudinaryService.deleteImage(imagePublicId);
            }
            const uploaded = await this.cloudinaryService.uploadImage(imageFile, "techvault/about-us");
            image = uploaded.secure_url;
            imagePublicId = this.extractPublicId(uploaded.secure_url, "techvault/about-us") ?? uploaded.public_id;
        }

        if (!existing) {
            const created = await this.prisma.aboutUsStory.create({
                data: {
                    eyebrow: dto.eyebrow ?? "",
                    heading: dto.heading,
                    paragraph: dto.paragraph,
                    tagline: dto.tagline,
                    image,
                    imagePublicId,
                },
            });
            return { message: "About Us story created successfully", data: created };
        }

        const updated = await this.prisma.aboutUsStory.update({
            where: { id: existing.id },
            data: {
                ...(dto.eyebrow !== undefined && { eyebrow: dto.eyebrow }),
                ...(dto.heading !== undefined && { heading: dto.heading }),
                ...(dto.paragraph !== undefined && { paragraph: dto.paragraph }),
                ...(dto.tagline !== undefined && { tagline: dto.tagline }),
                image,
                imagePublicId,
            },
        });
        return { message: "About Us story updated successfully", data: updated };
    }


    async getPromiseItems() {
        const items = await this.prisma.promiseItem.findMany({
            orderBy: { order: "asc" },
        });
        return { message: "Promise items fetched successfully", data: items };
    }

    async createPromiseItem(dto: CreatePromiseItemDto) {
        const count = await this.prisma.promiseItem.count();
        if (count >= MAX_PROMISE_ITEMS) {
            throw new BadRequestException(`You can have at most ${MAX_PROMISE_ITEMS} promise items`);
        }

        let order = dto.order;
        if (order === undefined) {
            const last = await this.prisma.promiseItem.findFirst({ orderBy: { order: "desc" } });
            order = last ? last.order + 1 : 0;
        }

        const item = await this.prisma.promiseItem.create({
            data: {
                title: dto.title,
                description: dto.description,
                ...(dto.icon !== undefined && { icon: dto.icon }),
                order,
            },
        });
        return { message: "Promise item created successfully", data: item };
    }

    async updatePromiseItem(id: string, dto: UpdatePromiseItemDto) {
        const existing = await this.prisma.promiseItem.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException("Promise item not found");

        const item = await this.prisma.promiseItem.update({
            where: { id },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.icon !== undefined && { icon: dto.icon }),
                ...(dto.order !== undefined && { order: dto.order }),
            },
        });
        return { message: "Promise item updated successfully", data: item };
    }

    async deletePromiseItem(id: string) {
        const existing = await this.prisma.promiseItem.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException("Promise item not found");

        const count = await this.prisma.promiseItem.count();
        if (count <= MIN_PROMISE_ITEMS) {
            throw new BadRequestException(`You must keep at least ${MIN_PROMISE_ITEMS} promise items`);
        }

        await this.prisma.promiseItem.delete({ where: { id } });
        return { message: "Promise item deleted successfully" };
    }

    async getFaqItems() {
        const items = await this.prisma.faqItem.findMany({
            orderBy: { order: "asc" },
        });
        return { message: "FAQ items fetched successfully", data: items };
    }

    async createFaqItem(dto: CreateFaqItemDto) {
        const count = await this.prisma.faqItem.count();
        if (count >= MAX_FAQ_ITEMS) {
            throw new BadRequestException(`You can have at most ${MAX_FAQ_ITEMS} FAQ items`);
        }

        let order = dto.order;
        if (order === undefined) {
            const last = await this.prisma.faqItem.findFirst({ orderBy: { order: "desc" } });
            order = last ? last.order + 1 : 0;
        }

        const item = await this.prisma.faqItem.create({
            data: {
                question: dto.question,
                answer: dto.answer,
                order,
            },
        });
        return { message: "FAQ item created successfully", data: item };
    }

    async updateFaqItem(id: string, dto: UpdateFaqItemDto) {
        const existing = await this.prisma.faqItem.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException("FAQ item not found");

        const item = await this.prisma.faqItem.update({
            where: { id },
            data: {
                ...(dto.question !== undefined && { question: dto.question }),
                ...(dto.answer !== undefined && { answer: dto.answer }),
                ...(dto.order !== undefined && { order: dto.order }),
            },
        });
        return { message: "FAQ item updated successfully", data: item };
    }

    async deleteFaqItem(id: string) {
        const existing = await this.prisma.faqItem.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException("FAQ item not found");

        const count = await this.prisma.faqItem.count();
        if (count <= MIN_FAQ_ITEMS) {
            throw new BadRequestException(`You must keep at least ${MIN_FAQ_ITEMS} FAQ items`);
        }

        await this.prisma.faqItem.delete({ where: { id } });
        return { message: "FAQ item deleted successfully" };
    }
}