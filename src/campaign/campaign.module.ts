import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { CampaignEmailProcessor } from './campaign-email.processor';
import { CampaignCleanupService } from './campaign-cleanup.service';

@Module({
  imports:[
    BullModule.registerQueue({
      name:"email-campaign"
    })
  ],
  controllers: [CampaignController],
  providers: [CampaignService, CampaignEmailProcessor, CampaignCleanupService],
  exports:[CampaignService]
})
export class CampaignModule {}
