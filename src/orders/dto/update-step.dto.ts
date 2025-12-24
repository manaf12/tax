// src/orders/dto/update-step.dto.ts
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { StepStatus } from '../../types/steps';

export class UpdateStepDto {
  @IsString()
  step: string;

  @IsEnum(StepStatus)
  status: StepStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
