import { Transform } from "class-transformer";
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ArrayMinSize,
    ArrayMaxSize,
} from "class-validator";

export class CreateCompanyInfoDto {
    @IsNotEmpty()
    @IsString()
    companyName!: string;

    @IsNotEmpty()
    @IsString()
    officeAddress!: string;

    @IsNotEmpty()
    @IsString()
    officeTelephone!: string;

    @IsNotEmpty()
    @Transform(({ value }) => (typeof value === "string" ? JSON.parse(value) : value))
    @IsArray()
    @ArrayMinSize(1, { message: "You must provide between 1 and 3 email addresses" })
    @ArrayMaxSize(3, { message: "You must provide between 1 and 3 email addresses" })
    @IsString({ each: true })
    emails!: string[];

    @IsNotEmpty()
    @Transform(({ value }) => (typeof value === "string" ? JSON.parse(value) : value))
    @IsArray()
    @ArrayMinSize(1, { message: "You must provide between 1 and 3 phone numbers" })
    @ArrayMaxSize(3, { message: "You must provide between 1 and 3 phone numbers" })
    @IsString({ each: true })
    phones!: string[];

    @IsOptional()
    @IsString()
    description!: string;

    @IsOptional()
    @Transform(({ value }) => (typeof value === "string" ? JSON.parse(value) : value))
    @IsObject()
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        twitter?: string;
        youtube?: string;
        tiktok?: string;
    };

    @IsNotEmpty()
    @Transform(({ value }) => parseFloat(value))
    @IsNumber()
    mapLatitude!: number;

    @IsNotEmpty()
    @Transform(({ value }) => parseFloat(value))
    @IsNumber()
    mapLongitude!: number;

    @IsOptional()
    @IsString()
    mapEmbedUrl?: string;
}