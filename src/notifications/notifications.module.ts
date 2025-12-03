import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailService } from '../email/email.service'; // نفترض أن لديك EmailService جاهزة
import { UsersModule } from 'src/users/user.module';

@Module({
  imports: [],
  providers: [NotificationsService, EmailService, UsersModule],
  exports: [NotificationsService], // تصدير الخدمة لاستخدامها في جميع الوحدات الأخرى
})
export class NotificationsModule {}
