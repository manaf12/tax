import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/user.module'; // استيراد وحدة المستخدمين
import { File } from './files/file.entity';
import { QuestionnaireResponse } from './questionnaire/questionnaire-response.entity'; // استيراد كيان الاستبيانmodule'; // استيراد وحدة الملفات
import { User } from './users/user.entity';
import { RefreshToken } from './auth/refresh-token.entity';
import { PasswordResetToken } from './auth/password-reset-token.entity';
import { ConfigModule } from '@nestjs/config';
import { I18nModule, AcceptLanguageResolver } from 'nestjs-i18n';
import { ClientProfileLanguageResolver } from './users/client-profile-language.resolver'; // استيراد الـ Resolver المخصص
import * as dotenv from 'dotenv';
import { FilesModule } from './files/files.module';
import { ClientProfile } from './users/client-profile.entity';
import { QuestionnaireModule } from './questionnaire/questionnaire.module';
import { TaxFilingModule } from './tax-filing/tax-filing.module';
import { Pricing } from './pricing/pricing.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { TaxDeclaration } from './orders/tax-declaration.entity';
import { Payment } from './payment/payment.entity';
import { OrdersModule } from './orders/orders.module';
import { PricingModule } from './pricing/pricing.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { MinioModule } from './minio/minio.module';
import { ClamAVModule } from './clamav/clamav.module';
import { join } from 'path';
dotenv.config();
import * as fs from 'fs';

const distI18n = join(process.cwd(), 'dist', 'src', 'i18n');
const srcI18n = join(process.cwd(), 'src', 'i18n');
const i18nPath = fs.existsSync(distI18n) ? distI18n : srcI18n;
const watchI18n = fs.existsSync(srcI18n);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    I18nModule.forRoot({
      fallbackLanguage: 'en', // اللغة الافتراضية
      loaderOptions: {
        path: i18nPath,
        watch: watchI18n,
      },
      resolvers: [
        ClientProfileLanguageResolver, // الـ Resolver المخصص له الأولوية
        AcceptLanguageResolver,
        // يمكن إضافة resolvers أخرى هنا، مثل QueryResolver أو HeaderResolver
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ||
        'postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-mysecretpassword}@db:5432/${POSTGRES_DB:-swisstax}',
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
      synchronize: true,
      logging: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UsersModule, // إضافة وحدة المستخدمين
    FilesModule, // إضافة وحدة الملفات
    QuestionnaireModule,
    TaxFilingModule,
    NotificationsModule,
    OrdersModule, // إضافة وحدة الطلبات
    PricingModule, // إضافة وحدة التسعير
    PaymentModule, // إضافة وحدة الدفع
    AdminModule,
    MinioModule,
    ClamAVModule,
  ],
})
export class AppModule {}
