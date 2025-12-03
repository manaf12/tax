import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgres://postgres:mysecretpassword@db:5432/swisstax', // استخدم نفس إعدادات الاتصال
  entities: [
    path.join(__dirname, '**', '*.entity{.ts,.js}'), // مسار جميع الكيانات
  ],
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')], // مسار ملفات الترحيل
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});

export default AppDataSource;
