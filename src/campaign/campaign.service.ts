import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { Queue } from 'bullmq';
import { CampaignAttachment, MAX_ATTACHMENTS } from './campaign.constants';
import { QueryCampaignsDto } from './dto/query-campaigns.dto';
import { Prisma } from '@prisma/client';

export interface EmailJobData{
    campaignId:string;
    email:string;
    subject:string;
    body:string;
    unsubscribeToken:string;
    attachments:CampaignAttachment[];
}

@Injectable()
export class CampaignService {
    constructor(
        private readonly prisma:PrismaService,
        @InjectQueue('email-campaign') 
        private readonly emailQueue:Queue<EmailJobData>,
    ){}

    async sendCampaign(userId:string, dto:SendCampaignDto, files:Express.Multer.File[]){
        if(!files || files.length===0){
            throw new BadRequestException("At least one attachment is required");
        }
        if(files.length>3){
            throw new BadRequestException(`Maximum of ${MAX_ATTACHMENTS} attachments allowed`);
        }

        const sender=await this.prisma.user.findUnique({
            where:{id:userId},
            select:{email:true}
        });

        if(!sender){
            throw new NotFoundException("Sender account not found");
        }

        const activeSubscribers=await this.prisma.subscriber.findMany({
            where:{isActive:true},
            select:{
                email:true,
                unsubscribeToken:true
            }
        })

        if(activeSubscribers.length===0){
            throw new BadRequestException("No active subscribers to send to");
        }

        const attachments:CampaignAttachment[]=files.map((file)=>({
            fileName:file.originalname,
            storedAs:file.filename,
            mimeType:file.mimetype
        }))

        const campaign=await this.prisma.campaign.create({
            data:{
                subject:dto.subject.trim(),
                body:dto.body.trim(),
                sentByEmail:sender.email,
                status:"PROCESSING",
                totalRecipients:activeSubscribers.length,
                attachments:attachments as unknown as Prisma.InputJsonValue,
                startedAt:new Date(),
            }
        })

        const jobs=activeSubscribers.map((subscriber)=>({
            name:"send-email",
            data:{
                campaignId:campaign.id,
                email:subscriber.email,
                subject:campaign.subject,
                body:dto.body.trim(),
                unsubscribeToken:subscriber.unsubscribeToken,
                attachments,
            } satisfies EmailJobData,
            opts:{
                attempts:3,
                backoff:{type:"exponential",delay:5_000},
                removeOnComplete:{age:3600,count:1000},
                removeOnFail:{age:24*3600},
            }
        }))

        await this.emailQueue.addBulk(jobs);

        return{
            message:`Campaign queued for ${activeSubscribers.length} subscribers`,
            data:{
                campaignId:campaign.id,
                totalRecipients:activeSubscribers.length,
                attachments:attachments.map((a)=>a.fileName),
                status:campaign.status
            }
        }
    }

    async getCampaignById(id:string){
        const campaign=await this.prisma.campaign.findUnique({
            where:{id}
        });

        if(!campaign){
            throw new BadRequestException("Campaign not found");
        }

        return{
            message:"Campaign fetched successfully",
            data:campaign
        }
    }

    async getAllCampaigns(query:QueryCampaignsDto){
        const { page=1, limit=10 }=query;
        const skip=(page-1)*limit;

        const [campaigns,total]=await Promise.all([
            this.prisma.campaign.findMany({
                orderBy:{createdAt:"desc"},
                skip,
                take:limit
            }),
            this.prisma.campaign.count()
        ])

        const totalPages=Math.ceil(total/limit);

        return{
            message:"Campaigns fetched successfully",
            data:campaigns,
            pagination:{
                total,
                page,
                limit,
                totalPages,
                hasNextPage:page<totalPages,
                hasPrevPage:page>1
            }
        }
    }
}
