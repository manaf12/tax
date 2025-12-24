import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OfferType } from 'src/orders/tax-declaration.entity';

class BillingDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

export class FinalizeDto {
  @IsEnum(OfferType)
  offer: OfferType;

  @IsOptional()
  billing?: BillingDto;
}
