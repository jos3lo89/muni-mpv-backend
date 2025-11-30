import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findForSignIn(emailOrDni: string) {
    return await this.prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrDni }, { dni: emailOrDni }],
      },
    });
  }
}
