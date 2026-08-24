import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCompanyInfoDto } from './dto/create-companyInfo.dto';
import { UpdateCompanyInfoDto } from './dto/update-companyInfo.dto';
import { log } from 'console';

@Injectable()
export class CompanyInfoService {
    constructor(
        private readonly prisma:PrismaService,
        private readonly cloudinaryService:CloudinaryService
    ){}

    private extractPublicId(url:string, folder:string):string|null{
        const filename=url.split("/").pop()?.split(".")[0];
        return filename? `${folder}/${filename}`:null;
    }

    async getCompanyInfo(){
        const info=await this.prisma.companyInfo.findFirst();

        if(!info){
            throw new NotFoundException("Company information has not been set up yet");
        }

        return {
            message:"Company info fetched successfully",
            info
        }
    }

    async createCompanyInfo(dto:CreateCompanyInfoDto, logoFile?:Express.Multer.File){
        const existing=await this.prisma.companyInfo.findFirst();

        if(existing){
            throw new BadRequestException("Company information already exists. Please use update");
        }

        if(!logoFile){
            throw new BadRequestException("A logo is required when setting up company info");
        }

        if(!dto.emails?.length){
            throw new BadRequestException("At least one email address is required");
        }

        if(!dto.phones?.length){
            throw new BadRequestException("At least one phone number is required");
        }

        const uploaded=await this.cloudinaryService.uploadImage(logoFile,"techvault/company");

        const info=await this.prisma.companyInfo.create({
            data:{
                companyName:dto.companyName,
                officeAddress:dto.officeAddress,
                officeTelephone:dto.officeTelephone,
                emails:dto.emails,
                phones:dto.phones,
                description:dto.description,
                logo:uploaded.secure_url,
                socialLinks:dto.socialLinks,
                mapLatitude:dto.mapLatitude,
                mapLongitude:dto.mapLongitude,
                mapEmbedUrl:dto.mapEmbedUrl,
            }
        })

        return{
            message:"Company Info created successfully",
            info
        }
    }

    async updateCompanyInfo(dto:UpdateCompanyInfoDto, logoFile?:Express.Multer.File){
        const existing= await this.prisma.companyInfo.findFirst();
        
        if(!existing){
            throw new BadRequestException("Company information has not been set up yet. Please create it first");
        }

        if(dto.emails!==undefined && dto.emails.length===0){
            throw new BadRequestException("At least one email address is required");
        }

        if(dto.phones?.at!==undefined && dto.phones.length===0){
            throw new BadRequestException("At least one phone number is required");
        }

        let logoUrl=existing.logo;
        if(logoFile){
            if(existing.logo){
                const publicId=this.extractPublicId(existing.logo,"techvault/company");
                if(publicId){
                    await this.cloudinaryService.deleteImage(publicId);
                }
            }
            const uploaded=await this.cloudinaryService.uploadImage(logoFile,"techvault/company");
            logoUrl=uploaded.secure_url;
        }


        const updateData:any={
            ...(dto.companyName!==undefined && {companyName:dto.companyName}),
            ...(dto.officeAddress!==undefined && {officeAddress:dto.officeAddress}),
            ...(dto.officeTelephone!==undefined && {officeTelephone:dto.officeTelephone}),
            ...(dto.emails!==undefined && {emails:dto.emails}),
            ...(dto.phones!==undefined && {phones:dto.phones}),
            ...(dto.description!==undefined && {description:dto.description}),
            ...(dto.socialLinks!==undefined && {socialLinks:dto.socialLinks}),
            ...(dto.mapLatitude!==undefined && {mapLatitude:dto.mapLatitude}),
            ...(dto.mapLongitude!==undefined && {mapLongitude:dto.mapLongitude}),
            ...(dto.mapEmbedUrl!==undefined && {mapEmbedUrl:dto.mapEmbedUrl}),
            logo:logoUrl
        }

        const updated=await this.prisma.companyInfo.update({
            where:{id:existing.id},
            data:updateData
        })

        return{
            message:"Company info updated successfully",
            info:updated
        }
    }

    async deleteCompanyInfo(){
        const existing=await this.prisma.companyInfo.findFirst();

        if(!existing){
            throw new BadRequestException("No company info to delete");
        }

        if(existing.logo){
            const publicId=this.extractPublicId(existing.logo,"techvault/company");
            if(publicId){
                await this.cloudinaryService.deleteImage(publicId);
            }
        }

        await this.prisma.companyInfo.delete({
            where:{id:existing.id},
        });

        return{
            message:"Company info deleted successfully"
        }
    }

}
