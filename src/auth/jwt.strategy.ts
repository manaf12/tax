/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/auth/jwt.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config'; // <-- الخطوة 1: استيراد

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // --- بداية التعديل ---
  constructor(private configService: ConfigService) {
    // <-- الخطوة 2: حقن ConfigService
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // الخطوة 3: استخدم configService لجلب المفتاح السري
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }
  // --- نهاية التعديل ---

  async validate(payload: any) {
    // هذا الجزء من الكود سليم ولا يحتاج تعديلاً
    // سيتم تنفيذه فقط بعد التحقق من صحة التوكن بنجاح
    console.log('JWT validation successful. Payload:', payload); // يمكنك إضافة هذا السطر للتأكد
    return { sub: payload.sub, roles: payload.roles };
  }
}
