import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Cron } from "@nestjs/schedule";
import { OrderStatus } from "@prisma/client";
import { OrdersService } from "./orders.service";

const RETENTION_MS=1*60*60*1000;

@Injectable()
export class OrderCleanupService{
    private readonly logger=new Logger(OrderCleanupService.name)
    
    constructor ( 
        private readonly prisma:PrismaService,
        private readonly orderService:OrdersService
    ){}

    @Cron("0 3 * * *")
    async deleteExpiredOrders(){
        const cutoff= new Date(Date.now()-RETENTION_MS);

        const expiredOrders=await this.prisma.order.findMany({
            where:{
                status:OrderStatus.PENDING,
                createdAt:{lt:cutoff}
            },
            include:{items:true}
        })

        for(const order of expiredOrders){
            try{
                await this.orderService.deletePendingOrder(order.id);
                this.logger.log(`Cleaned up abandoned order ${order.id}`);
            }catch(err){
                this.logger.error(`Failed to cleanup order ${order.id}`,err);
            }
        }
    }
}