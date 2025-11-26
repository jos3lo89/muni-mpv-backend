import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../auth/decorators/role.decorator';
import { Role } from 'src/common/enums/role.enum';
import { AuthAndRoleGuard } from '../auth/decorators/auth.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('create-user') createUser() {
    return this.usersService.createUser();
  }

  @AuthAndRoleGuard(Role.SUPER_ADMIN)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @AuthAndRoleGuard(Role.MESA_DE_PARTES)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':email-or-dni')
  findOne(@Param('email-or-dni') emailOrDni: string) {
    return this.usersService.findOne(emailOrDni);
  }
}
