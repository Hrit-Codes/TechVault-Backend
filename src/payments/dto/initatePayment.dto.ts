import { IsNotEmpty, IsUUID } from "class-validator";

export class InitiatePaymentDto{
    @IsNotEmpty()
    @IsUUID()
    orderId!:string;
}