import { IsNotEmpty, IsString } from "class-validator";

export class SendCampaignDto{
    @IsNotEmpty()
    @IsString()
    subject!:string;

    @IsNotEmpty()
    @IsString()
    body!:string;
}