import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import type { RegisterRequestDto } from '../auth/dto/register-request.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailOrPhone(email: string, phoneNumber: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber }],
      },
    });
  }

  async findByEmail(email:string){
    return this.prisma.user.findFirst({
      where:{email:email}
    })
  }

  async findById(id:string){
    return this.prisma.user.findFirst({
      where:{id}
    })
  }

  async verifyPassword(email:string, password:string):Promise<any>{
    const user= await this.prisma.user.findFirst({
      where:{ email },
      select:{
        id:true,
        email:true,
        fullName:true,
        phoneNumber:true,
        role:true,
        isVerified:true,
        password:true
      }
    });

    console.log("Found user",user?.email);
    console.log("Password from DB", user?.password?.substring(0,20));

    if(!user) throw new UnauthorizedException("Invalid credentials");

    const isPasswordValid= await argon2.verify(user.password, password);

    if(!isPasswordValid) throw new UnauthorizedException("Invalid credentials");

    const {password:_, ...userWithoutPassword}=user;
    return userWithoutPassword
  }

  async createUser(data: RegisterRequestDto) {
    const hashedPassword = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,         // 3 iterations
      parallelism: 4,      // 4 parallel threads
    });
    
    return this.prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        isVerified: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async saveRefreshToken(userId:string, refreshToken:string):Promise<void>{
    const hashedToken= await argon2.hash(refreshToken,{
      type:argon2.argon2id
    });

    await this.prisma.user.update({
      where:{id:userId},
      data:{refreshToken:hashedToken}
    })
  }

  async clearRefreshToken(userId:string):Promise<void>{
    await this.prisma.user.update({
      where:{id:userId},
      data:{refreshToken:null}
    })
  }

  async updateLastLogin(userId:string):Promise<void>{
    await this.prisma.user.update({
      where:{id:userId},
      data:{lastLogin:new Date()}
    })
  }

  async verifyRefreshToken(userId:string, refreshToken:string):Promise<any>{
    const user= await this.prisma.user.findUnique({
      where:{id:userId},
      select:{
        id:true,
        email:true,
        fullName:true,
        role:true,
        refreshToken:true,
        isActive:true
      }
    });

    if(!user|| !user.refreshToken){
      throw new UnauthorizedException("Access Denied");
    }

    if(!user.isActive){
      throw new UnauthorizedException("Account is deactivated");
    }

    const isTokenValid=await argon2.verify(user.refreshToken, refreshToken);
    if(!isTokenValid){
      throw new UnauthorizedException("Access denied");
    }

    const {refreshToken:_, ...userWithoutToken}=user;
    return userWithoutToken;
  }

}