import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { RedisService } from '../redis/redis.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports:[MailerModule],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
