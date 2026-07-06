import { Injectable, type OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
    private client!:Redis;

    onModuleInit() {
        this.client= new Redis(process.env.REDIS_URL!);

        this.client.on('connect',()=>{
            console.log("Redis connected successfully")
        })

        this.client.on('error',(err)=>{
            console.log("Redis connection error:",err)
        })
    }

    getClient():Redis{
        return this.client;
    }
}
