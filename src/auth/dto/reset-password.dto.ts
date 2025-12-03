import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string; // tokenComposite: <id>.<raw>

  @IsString()
  @MinLength(8)
  newPassword: string;
}
