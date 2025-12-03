import { OrdersModule } from './../orders/orders.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TaxDeclaration } from '../orders/tax-declaration.entity'; // نحتاج إلى الوصول إلى كيان الطلب
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesModule } from 'src/files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaxDeclaration]),
    NotificationsModule,
    OrdersModule,
    FilesModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
