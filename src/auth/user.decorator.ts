/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // هذا هو الكائن الذي يضعه الـ Guard

    if (!user) {
      return null; // أو يمكنك إلقاء خطأ إذا لم يكن هناك مستخدم
    }

    // إذا تم تمرير مفتاح (مثل 'sub')، أعد قيمته
    return data ? user[data] : user;
  },
);
