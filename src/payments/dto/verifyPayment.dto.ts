import { IsNotEmpty, IsString } from "class-validator";

export class VerifyPaymentDto{
    @IsNotEmpty()
    @IsString()
    pidx!:string;
}