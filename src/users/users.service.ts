import { Injectable } from '@nestjs/common';
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
}