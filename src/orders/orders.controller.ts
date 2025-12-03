/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  NotFoundException,
  Patch,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './order.service';
import type { UserPayload } from '../types/request.d';
import { TaxDeclaration } from './tax-declaration.entity';
import { User } from '../auth/user.decorator'; // يجب أن يكون لديك هذا الديكوراتور
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('draft')
  async createDraft(
    @Req() req: { user: UserPayload },
  ): Promise<TaxDeclaration> {
    return this.ordersService.findOrCreateDraft(req.user.sub);
  }

  /**
   */
  @Get('my-declarations')
  async getMyDeclarations(
    @Req() req: { user: UserPayload },
  ): Promise<TaxDeclaration[]> {
    return this.ordersService.findAllByUserId(req.user.sub);
  }

  /**
   * GET /orders/:declarationId
   * يجلب إقرارًا واحدًا مع تفاصيله.
   */
  @Get(':declarationId')
  async getDeclarationDetails(
    @Param('declarationId') declarationId: string,
    @Req() req: { user: UserPayload },
  ): Promise<TaxDeclaration> {
    const declaration = await this.ordersService.findOne(declarationId);

    // تحقق من الملكية (مهم جداً للأمان)
    if (declaration.clientProfile.user.id !== req.user.sub) {
      throw new NotFoundException('Declaration not found or access denied.');
    }

    return declaration;
  }
  @Post(':declarationId/submit')
  async submitDraft(
    @Param('declarationId') declarationId: string,
    @User() user: UserPayload, // استخدام الديكوراتور لجلب بيانات المستخدم
  ): Promise<TaxDeclaration> {
    // يجب أن يكون لديك كيان User في مكان ما
    const userEntity = { id: user.sub } as any; // تحويل مؤقت لـ UserPayload إلى كيان User
    return this.ordersService.submitDraft(declarationId, userEntity);
  }

  /**
   * PATCH /orders/:declarationId/accept-pricing
   * [دورة حياة العميل] يقبل العميل السعر المحسوب وينتقل إلى PENDING_PAYMENT.
   */
  // @Patch(':declarationId/accept-pricing')
  // async acceptPricing(
  //   @Param('declarationId') declarationId: string,
  //   @User('sub') userId: string, // استخراج معرف المستخدم مباشرة
  // ): Promise<TaxDeclaration> {
  //   return this.ordersService.acceptPricing(declarationId, userId);
  // }
  @Patch(':declarationId/steps')
  @UseGuards(JwtAuthGuard, RolesGuard) // RolesGuard يتأكد من ADMIN
  async updateStep(
    @Param('declarationId') declarationId: string,
    @Body() body: { step: string; status: string; note?: string },
    @User('sub') adminId: string,
  ) {
    return this.ordersService.updateStep(
      declarationId,
      body.step,
      body.status,
      adminId,
      { note: body.note },
    );
  }
}
