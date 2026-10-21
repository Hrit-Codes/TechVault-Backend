import { PaymentMethod } from "@prisma/client";
import { Type } from "class-transformer";
import {
    IsEnum,
    IsNotEmpty,
    IsString,
    ValidateNested,
} from "class-validator";

export class ShippingAddressDto {
    @IsString()
    @IsNotEmpty()
    fullName!: string;

    @IsString()
    @IsNotEmpty()
    phoneNumber!: string;

    @IsString()
    @IsNotEmpty()
    street!: string;

    @IsString()
    @IsNotEmpty()
    city!: string;
}

export class CreateOrderDto {
    // Order items are sourced from the user's cart — only checkout
    // details are required in the request body.
    @ValidateNested()
    @Type(() => ShippingAddressDto)
    @IsNotEmpty()
    shippingAddress!: ShippingAddressDto;

    @IsEnum(PaymentMethod)
    paymentMethod!: PaymentMethod;
}
