import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { NewsletterService } from './newsletter.service';
import {
  CheckSubscriptionDto,
  SubscribeDto,
  UnsubscribeDto,
} from './dto/subscribe.dto';
import { QuerySubscribersDto } from './dto/query-subscribers.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  // ========== PUBLIC ==========

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto.email);
  }

  @Post('check-status')
  @HttpCode(HttpStatus.OK)
  async checkSubscriptionStatus(@Body() dto: CheckSubscriptionDto) {
    return this.newsletterService.getSubscriptionStatus(dto.email);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.newsletterService.unsubscribeByEmail(dto.email);
  }

  // Used by the "Unsubscribe" link inside newsletter emails
  @Get('unsubscribe/:token')
  @HttpCode(HttpStatus.OK)
  async unsubscribeByToken(@Param('token') token: string) {
    return this.newsletterService.unsubscribeByToken(token);
  }

  // ========== ADMIN ==========

  @Get('admin/all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAllSubscribers(@Query() query: QuerySubscribersDto) {
    return this.newsletterService.getAllSubscribers(query);
  }

  @Get('admin/stats')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getSubscribersStats() {
    return this.newsletterService.getSubscribersStats();
  }
}
