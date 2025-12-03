// src/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();
import { User } from './users/user.entity';
import { RefreshToken } from './auth/refresh-token.entity';
import { PasswordResetToken } from './auth/password-reset-token.entity';
import { TaxDeclaration } from './orders/tax-declaration.entity';
import { Payment } from './payment/payment.entity';
import { Pricing } from './pricing/pricing.entity';
import { QuestionnaireResponse } from './questionnaire/questionnaire-response.entity';
import { ClientProfile } from './users/client-profile.entity';
import { File } from './files/file.entity';
// NOTE: The TypeORM CLI runs outside of the NestJS environment,
// so you might need to ensure your environment variables (like DATABASE_URL)
// are loaded before running the CLI command. You might need to install and use 'dotenv'.
// If you are using a tool like 'ts-node-dev' or 'nodemon' with a config file,
// it might load them automatically.

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgres://postgres:mysecretpassword@db:5432/swisstax',
  // List all your entities here, just like in AppModule
  entities: [
    User,
    ClientProfile,
    RefreshToken,
    PasswordResetToken,
    File,
    QuestionnaireResponse,
    Pricing,
    TaxDeclaration,
    Payment,
  ],

  // Path to your migration files
  migrations: [__dirname + '/migrations/*.{ts,js}'],

  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
