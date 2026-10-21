import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ALLOWED_MIME_TYPES, ATTACHMENT_DIR, MAX_ATTACHMENTS, MAX_ATTACHMENTS_SIZE } from './campaign.constants';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { GetUser } from '../common/decorators/get-user.decorator';
import { QueryCampaignsDto } from './dto/query-campaigns.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { JwtGuard } from '../common/guards/jwt.guard';

@Controller('campaign')
@UseGuards(JwtGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FilesInterceptor("attachments", MAX_ATTACHMENTS, {
      storage: diskStorage({
        destination: ATTACHMENT_DIR,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_ATTACHMENTS_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new Error("Only JPEG, PNG, WebP, and PDF files are allowed"),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async sendCampaign(
    @GetUser("id") userId: string,
    @Body() dto: SendCampaignDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.campaignService.sendCampaign(userId, dto, files);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllCampaigns(
    @Query() query:QueryCampaignsDto
  ){
    return this.campaignService.getAllCampaigns(query);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async GetCampaignById(
    @Param("id") id:string
  ){
    return this.campaignService.getCampaignById(id);
  }
}
