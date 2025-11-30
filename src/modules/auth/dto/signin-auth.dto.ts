import { IsNotEmpty, IsString, Length } from 'class-validator';

export class SigninAuthDto {
  @IsNotEmpty()
  @IsString()
  emailOrDni: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 32)
  password: string;
}
