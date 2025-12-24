import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddStepCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  comment!: string;
}
