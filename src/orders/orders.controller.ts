/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
  ValidationPipe,
  UsePipes,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './order.service';
import type { UserPayload } from '../types/request.d';
import { TaxDeclaration } from './tax-declaration.entity';
import { User } from '../auth/user.decorator'; // يجب أن يكون لديك هذا الديكوراتور
import { RolesGuard } from 'src/auth/roles.guard';
import { UpdateStepDto } from './dto/update-step.dto';
import { UserRole } from 'src/users/user.entity';
import { AddStepCommentDto } from './dto/add-step-comment.dto';

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
    @Param('declarationId', ParseUUIDPipe) declarationId: string,
    @Req() req: { user: UserPayload }, // Ensure UserPayload contains the roles array
  ): Promise<TaxDeclaration> {
    const isAdmin = req.user.roles?.includes(UserRole.ADMIN);

    const declaration = await this.ordersService.findDeclarationById(
      declarationId,
      ['clientProfile', 'clientProfile.user', 'files', 'pricing'],
    );

    if (!isAdmin && declaration.clientProfile.user.id !== req.user.sub) {
      throw new NotFoundException('Declaration not found or access denied.');
    }

    // 4. If the check passes (or is skipped), return the declaration.
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

  @Patch(':declarationId/steps')
  @UseGuards(JwtAuthGuard, RolesGuard) // RolesGuard يتأكد من ADMIN
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateStep(
    @Param('declarationId') declarationId: string,
    @Body() body: UpdateStepDto,
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
  @Post(':declarationId/steps/:stepId/confirm-download')
  async confirmDownload(
    @Param('declarationId') declarationId: string,
    @Param('stepId') stepId: string,
    @User('sub') userId: string,
    @Body() body: { fileId?: string } = {},
  ) {
    // يمكنك إضافة validation هنا إن أردت (parseUUID etc)
    return this.ordersService.confirmDownloadByUser(
      declarationId,
      stepId,
      userId,
      body.fileId,
    );
  }
  @Post(':declarationId/steps/:stepId/comment')
  async addStepComment(
    @Param('declarationId') declarationId: string,
    @Param('stepId') stepId: string,
    @Body() body: AddStepCommentDto,
    @Req() req: any,
    @User('sub') userId: string,
  ) {
    const declaration = await this.ordersService.findDeclarationById(
      declarationId,
      ['clientProfile'],
    );
    if (!declaration) throw new NotFoundException('Declaration not found');
    const isAdmin = req.user.roles?.includes(UserRole.ADMIN);

    // تأكد أن صاحب الطلب هو العميل
    if (declaration.clientProfile?.user?.id !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Not allowed to comment on this declaration',
      );
    }

    // declaration.steps هو JSON (مصفوفة) — تأكد من بنيته
    const steps: any[] = Array.isArray(declaration.steps)
      ? declaration.steps
      : [];

    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      throw new NotFoundException('Step not found in declaration.steps');
    }

    const now = new Date().toISOString();
    const existingMeta = steps[stepIndex].meta ?? {};

    const newMeta = {
      ...existingMeta,
      lastComment: { text: body.comment, by: userId, at: now },
      commentHistory: [
        ...(existingMeta.commentHistory ?? []),
        { text: body.comment, by: userId, at: now },
      ],
    };

    // نحدّث الخطوة داخل المصفوفة
    steps[stepIndex] = {
      ...steps[stepIndex],
      meta: newMeta,
    };

    // نكتب مرة واحدة الحقل steps (بما أنّه عمود jsonb)
    declaration.steps = steps;

    // نحفظ التغيير — استخدم الخدمة المناسبة عندك
    await this.ordersService.saveDeclaration(declarationId, { steps });

    return { ok: true, meta: newMeta };
  }
}
