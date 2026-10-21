import { 
  Body, Controller, Post, Patch, Get, Param, Query, 
  UseGuards 
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
@UseGuards(JwtGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── USER ROUTES ────────────────────────────────────────
  
  @Post()
  async checkout(@GetUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(userId, dto);
  }

  @Get('my-orders')
  async getMyOrders(@GetUser('id') userId: string, @Query() query: QueryOrdersDto) {
    return this.ordersService.getMyOrders(userId, query);
  }

  // ─── ADMIN ROUTES ───────────────────────────────────────

  @Get('admin/all')
  @Roles(Role.ADMIN)
  async getAllOrders(@Query() query: QueryOrdersDto) {
    return this.ordersService.getAllOrders(query);
  }

  @Patch('admin/:id/status')
  @Roles(Role.ADMIN)
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto.status);
  }

  @Patch('admin/:id/refund')
  @Roles(Role.ADMIN)
  async refund(@Param('id') id: string) {
    return this.ordersService.refundOrder(id);
  }

  // ─── SHARED ROUTE ───────────────────────────────────────

  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') role: Role,
  ) {
    const isAdmin = role === Role.ADMIN;
    return this.ordersService.getOrderById(id, userId, isAdmin);
  }
}