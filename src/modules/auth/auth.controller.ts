import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SigninAuthDto } from './dto/signin-auth.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Body() body: SigninAuthDto,
    @Res({
      passthrough: true,
    })
    res: Response,
  ) {
    const { token, userWithoutPassword } = await this.authService.signIn(body);

    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    return userWithoutPassword;
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  signOut(@Res({ passthrough: true }) res: Response) {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
    });

    return { message: 'Sesión cerrada correctamente' };
  }
}
