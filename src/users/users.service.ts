import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { RegisterRequestDto } from '../auth/dto/register-request.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { IPagination } from '../types/pagination.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService:CloudinaryService,
  ) {}

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
    console.log("Email received:",email);
    console.log("Password received:",password);
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

  async updateAvatar(userId:string, file:Express.Multer.File):Promise<any>{
    const user= await this.prisma.user.findUnique({
      where:{id:userId},
      select:{id:true,avatar:true}
    });

    if(!user) throw new NotFoundException("User not found");

    if(user.avatar){
      const publicId=user.avatar.split('/').pop()?.split(`.`)[0];
      if(publicId){
        await this.cloudinaryService.deleteImage(`techvault/avatars/${publicId}`);
      }
    }
    const result=await this.cloudinaryService.uploadAvatar(file);

    const updatedUser=await this.prisma.user.update({
      where:{id:userId},
      data:{avatar:result.secure_url},
      select:{id:true, fullName:true, email:true, avatar:true}
    })

    return{
      message:"Avatar updated successfully",
      user:updatedUser
    }
  }

  async updateProfile(userId:string,dto:UpdateProfileDto):Promise<any>{
    const user= await this.prisma.user.findUnique({
      where:{id:userId},
    });
      if (!user) throw new NotFoundException("User not found");

      if(user.role==="ADMIN" && dto.defaultAddress){
        throw new BadRequestException("Admins cannot set a default address");
      }

      if(dto.phoneNumber){
        const existingPhone= await this.prisma.user.findFirst({
          where:{phoneNumber:dto.phoneNumber, NOT:{id:userId}}
        });

        if(existingPhone){
          throw new ConflictException("Phone number is already in use");
        }
      }

      const updatedUser= await this.prisma.user.update({
        where:{id:userId},
        data:{
          ...(dto.fullName && {fullName:dto.fullName}),
          ...(dto.phoneNumber && { phoneNumber:dto.phoneNumber}),
          ...(dto.defaultAddress && { defaultAddress: { ...dto.defaultAddress}})
        },
        select:{
          id:true,
          fullName:true,
          email:true,
          phoneNumber:true,
          defaultAddress:true,
          avatar:true,
        }
      });

      return {
        message:'Profile updated successfully',
        user:updatedUser
      }
  }

  async updatePassword(userId:string, dto:ChangePasswordDto):Promise<any>{
    const user= await this.prisma.user.findUnique({
      where:{id:userId}
    })

    if(!user)
      throw new NotFoundException("User not found");

    const isOldPasswordValid= await argon2.verify(user.password, dto.oldPassword);

    if(!isOldPasswordValid){
      throw new UnauthorizedException("Old password is incorrect");
    };

    const hashedNewPassword= await argon2.hash(dto.newPassword,{
      type:argon2.argon2id,
      memoryCost:2**16,
      timeCost:3,
      parallelism:4
    });

    await this.prisma.user.update({
      where:{id:userId},
      data:{password:hashedNewPassword}
    });

    return { message:"Password changed successfully"}
  }

  async deleteAccount(userId:string):Promise<any>{
    const user= await this.prisma.user.findUnique({
      where:{id:userId}
    })

    if(!user) throw new NotFoundException("User not found");

    if(user.role==="ADMIN"){
      throw new BadRequestException("Admin accounts cannot be deleted");
    }

    await this.prisma.user.delete({
      where:{id:userId}
    });

    return {
      message:"Account deleted successfully."
    }
  }

  async getProfile(userId:string):Promise<any>{
    const user=await this.prisma.user.findUnique({
      where:{id:userId},
      select:{
        id:true,
        fullName:true,
        email:true,
        phoneNumber:true,
        defaultAddress:true,
        avatar:true,
        role:true,
        isVerified:true,
        lastLogin:true,
        createdAt:true,
        updatedAt:true

      }
    });

    if(!user) throw new NotFoundException("User not found");

    return user;
  }

  async getAllUsers(
    page:number=1,
    limit:number=10,
    isActive?:boolean,
  ):Promise<{
    users:any[];
    pagination:IPagination;
  }>{
    const skip=(page-1)*limit;
    const where:any={};
    
    if(isActive!==undefined){
      where.isActive=isActive;
    }

    const [total,users]=await Promise.all([
      this.prisma.user.count({where}),
      this.prisma.user.findMany({
        where,
        skip,
        take:limit,
        orderBy:{createdAt:'desc'},
        omit:{
          password:true,
          refreshToken:true
        }
      })
    ]);

    const totalPages=Math.ceil(total/limit);
    const hasNextPage=page<totalPages;
    const hasPrevPage=page>1;

    return{
      users,
      pagination:{
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }
  }

  async toggleUserActive(userId:string):Promise<any>{
    const user= await this.prisma.user.findUnique({
      where:{id:userId}
    })

    if(!user) throw new NotFoundException("User not found");

    await this.prisma.user.update({
      where:{id:userId},
      data:{
        isActive:!user.isActive,
        refreshToken:null // clear session-
      }
    });

    return {
      message:`Account ${user.isActive?"deactivated":"activated"} successfully.`
    }
  }
}