import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SigninAuthDto } from './dto/signin-auth.dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(signinData: SigninAuthDto) {
    try {
      const user = await this.userService.findForSignIn(signinData.emailOrDni);

      if (!user) {
        throw new NotFoundException('user not found');
      }

      const pwdMatch = await bcrypt.compare(
        signinData.password,
        user.passwordHash,
      );

      if (!pwdMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = { userId: user.id, email: user.email, role: user.role };
      const token = await this.jwtService.signAsync(payload);

      const { passwordHash, ...userWithoutPassword } = user;

      return { token, userWithoutPassword };
    } catch (error) {
      console.error('signIn() error:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Error signing in');
    }
  }
}
