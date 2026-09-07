import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UsersService } from './users.service';
import { multerConfig } from '../cloudinary/multer.config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtGuard } from '../common/guards/jwt.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';
import { QueryUsersDto } from './dto/query-users.dto';

@Controller('users')
@UseGuards(JwtGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ========== USER PROFILE (Authenticated) ==========

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@GetUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @GetUser() user: any,
    @Body() body: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, body);
  }

  @Patch('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  async updateAvatar(
    @GetUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(user.id, file);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  async updatePassword(
    @GetUser() user: any,
    @Body() body: ChangePasswordDto,
  ) {
    return this.usersService.updatePassword(user.id, body);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateAccount(@GetUser() user: any) {
    await this.usersService.deleteAccount(user.id);
  }

  // ========== ADMIN ==========

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAllUsers(@Query() query: QueryUsersDto) {
    return this.usersService.getAllUsers(
      query.page,
      query.limit,
      query.search,
      query.isActive,
    );
  }

  @Get('admin/stats')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getUsersStats() {
    return this.usersService.getUsersStats();
  }

  @Patch('admin/:id/status')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleUserActive(@Param('id') id: string) {
    return this.usersService.toggleUserActive(id);
  }
}