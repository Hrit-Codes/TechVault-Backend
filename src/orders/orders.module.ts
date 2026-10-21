import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OffersModule } from '../offers/offers.module';

@Module({
  imports: [OffersModule],
  providers: [OrdersService],
  controllers: [OrdersController]
})
export class OrdersModule {}
