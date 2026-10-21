import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { InitiatePaymentDto } from './dto/initatePayment.dto';
import { VerifyPaymentDto } from './dto/verifyPayment.dto';

@Controller('payments')
@UseGuards(JwtGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('khalti/initiate')
  async initiateKhalti(
    @Body() dto: InitiatePaymentDto,
    @GetUser('id') userId: string,
  ) {
    return this.paymentsService.initiateKhalti(dto.orderId, userId);
  }

  @Post('khalti/verify')
  async verifyKhalti(
    @Body() dto: VerifyPaymentDto,
    @GetUser('id') userId: string,
  ) {
    return this.paymentsService.verifyKhalti(dto.pidx, userId);
  }
}