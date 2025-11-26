import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/core/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  async findAll() {
    try {
      const users = await this.prisma.user.findMany();
      return users;
    } catch (error) {
      throw new HttpException(
        'Error al obtener los usuarios',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findForSignIn(emailOrDni: string) {
    return await this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrDni }, { dni: emailOrDni }],
      },
    });
  }

  async findOne(emailOrDni: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: emailOrDni }, { dni: emailOrDni }],
        },
      });

      if (!user) {
        throw new HttpException('user not found', HttpStatus.NOT_FOUND);
      }

      const { passwordHash, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error) {
      console.error('Error en findOne()', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async createUser() {
    try {
      const newUser = await this.prisma.user.create({
        data: {
          email: 'mesa@mesa.com',
          passwordHash: await bcrypt.hash('mesapassword', 10),
          name: 'Jose Lopez',
          dni: '98765432',
          lastName: 'Lopez',
          role: 'MESA_DE_PARTES',
          username: '98765432',
        },
      });
      return newUser;
    } catch (error) {
      throw new HttpException(
        'Error al crear el usuario',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
