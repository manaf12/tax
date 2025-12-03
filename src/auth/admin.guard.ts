/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRole } from '../users/user.entity'; // استيراد الدور

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required.');
    }

    // 1. تأكد من أن الأدوار موجودة ومصفوفة
    if (!user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException(
        'Admin role required to access this resource.',
      );
    }

    // 2. تنظيف الأدوار قبل التحقق (الخطوة الحاسمة)
    const cleanedRoles = user.roles.map((role) => role.trim());

    // 3. التحقق من وجود دور المسؤول النظيف
    const hasAdminRole = cleanedRoles.includes(UserRole.ADMIN);

    if (!hasAdminRole) {
      throw new ForbiddenException(
        'Admin role required to access this resource.',
      );
    }

    return true;
  }
}
