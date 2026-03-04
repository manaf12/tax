import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdatePersonalInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
