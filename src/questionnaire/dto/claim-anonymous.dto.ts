import { IsString } from 'class-validator';

export class ClaimAnonymousDto {
  @IsString()
  token: string;
}
