/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/csrf/csrf.controller.ts
import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller('csrf')
export class CsrfController {
  @Get('token')
  getCsrfToken(@Req() req: Request): { csrfToken: string } {
    // @ts-ignore: csurf يضيف هذه الدالة ديناميكياً
    return { csrfToken: req.csrfToken() };
  }
}
