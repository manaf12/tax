import { IsString, IsIn } from 'class-validator';

export class UpdateLanguageDto {
  @IsString()
  @IsIn(['en', 'fr', 'de'], { message: 'Language must be one of: en, fr, de' })
  languagePreference: string;
}
