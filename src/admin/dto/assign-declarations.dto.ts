import {
  IsArray,
  ArrayNotEmpty,
  IsUUID,
  IsString,
  IsOptional,
} from 'class-validator';

export class AssignDeclarationsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  declarationIds: string[];

  @IsUUID('4')
  adminId: string;

  @IsOptional()
  @IsString()
  note?: string;
}
