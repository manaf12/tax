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
import { UserRole } from '../users/user.entity';

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
    console.log('User Roles:', user.roles);
    // تأكد من وجود roles
    if (!user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException(
        'Admin role required to access this resource.',
      );
    }

    // تنظيف الأدوار
    const cleanedRoles = user.roles.map((role) => role.trim());

    // تحقق الأدوار
    const isSuperAdmin = cleanedRoles.includes(UserRole.SUPER_ADMIN);
    const isAdmin = cleanedRoles.includes(UserRole.ADMIN);

    console.log('Is Super Admin:', isSuperAdmin); // Log if Super Admin
    console.log('Is Admin:', isAdmin); // Log if Admin
    if (!isAdmin && !isSuperAdmin) {
      throw new ForbiddenException(
        'Admin role required to access this resource.',
      );
    }

    // نضيف العلم isSuperAdmin للـ request.user
    user.isSuperAdmin = isSuperAdmin;

    return true;
  }
}
