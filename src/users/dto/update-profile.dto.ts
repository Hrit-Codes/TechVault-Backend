import { Type } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from "class-validator";

export class UpdateAddressDto{
    @IsOptional()
    @IsString()
    landmark?:string;

    @IsOptional()
    @IsString()
    street?:string;

    @IsOptional()
    @IsString()
    city?:string;

    @IsOptional()
    @IsString()
    province?:string;
}

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(30)
    fullName?:string;

    @IsOptional()
    @IsString()
    @Matches(/^(\+977[-\s]?)?9[78]\d{8}$/, {
        message: 'Phone number must be a valid Nepali number',
    })
    phoneNumber?:string;

    @IsOptional()
    @ValidateNested()
    @Type(()=>UpdateAddressDto)
    defaultAddress?:UpdateAddressDto;
}