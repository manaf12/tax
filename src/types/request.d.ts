import { Request } from 'express';

/**
 * تعريف حمولة المستخدم المستخرجة من JWT.
 * 'sub' هو المعرف الفريد للمستخدم (userId).
 */
export interface UserPayload {
  sub: string;
  username: string;
  roles: UserRole[];
}

/**
 * توسيع واجهة Express Request لتشمل خاصية المستخدم (user)
 * التي يتم حقنها بواسطة JwtAuthGuard.
 */
declare module 'express' {
  interface Request {
    user: UserPayload;
  }
}
