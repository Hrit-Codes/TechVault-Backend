import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Cron } from "@nestjs/schedule";
import { ATTACHMENT_DIR, CampaignAttachment, RETENTION_MS } from "./campaign.constants";
import { join } from "path";
import { unlink } from "fs/promises";

@Injectable()
export class CampaignCleanupService{
    private readonly logger=new Logger(CampaignCleanupService.name)

    constructor ( private readonly prisma:PrismaService){}

    @Cron("0 3 * * *")
    async deleteExpiredCampaigns(){
        const cutoff=new Date(Date.now()-RETENTION_MS);

        this.logger.log(
            `Running campaign cleanup. Deleting campaigns created before ${cutoff.toISOString()}`,
        );

        const expired=await this.prisma.campaign.findMany({
            where:{createdAt:{lt:cutoff}},
            select:{id:true, attachments:true}
        })

        if(expired.length===0){
            this.logger.log("No expired campaigns found");
            return;
        }

        let filesDeleted=0;
        let filesError=0;

        for (const campaign of expired){
            const attachments = (campaign.attachments as unknown as CampaignAttachment[]) ?? [];

            for(const att of attachments){
                if(!att.storedAs) continue;

                const fullPath=join(ATTACHMENT_DIR,att.storedAs);
                try{
                    await unlink(fullPath);
                    filesDeleted++;
                }catch(err:any){
                    if(err?.code==="ENQENT"){
                        continue;
                    }
                    filesError++;
                    this.logger.warn(
                        `Failed to delete attachment ${att.storedAs} : ${err.message}`
                    );
                }
            }
        }

        const result=await this.prisma.campaign.deleteMany({
            where:{id:{in:expired.map((c)=>c.id)}}
        });

        this.logger.log(
        `Cleanup complete: ${result.count} campaigns deleted, ` +
            `${filesDeleted} files removed` +
            (filesError > 0 ? `, ${filesError} file errors` : ""),
        );
    }
}