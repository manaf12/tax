/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { User } from '../auth/user.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UpdateStepDto } from './dto/update-step.dto';
import { UserRole } from 'src/users/user.entity';
import { AddStepCommentDto } from './dto/add-step-comment.dto';
import { UsersService } from 'src/users/users.service';
import { EmailService } from 'src/email/email.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly userService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  @Post('draft')
  async createDraft(
    @Req() req: { user: UserPayload },
  ): Promise<TaxDeclaration> {
    return this.ordersService.findOrCreateDraft(req.user.sub);
  }

  @Get('my-declarations')
  async getMyDeclarations(
    @Req() req: { user: UserPayload },
  ): Promise<TaxDeclaration[]> {
    return this.ordersService.findAllByUserId(req.user.sub);
  }

  @Get(':declarationId')
  async getDeclarationDetails(
    @Param('declarationId', ParseUUIDPipe) declarationId: string,
    @Req() req: { user: UserPayload },
  ): Promise<TaxDeclaration> {
    const isAdmin = req.user.roles?.includes(UserRole.ADMIN);
    const isSuper = req.user.roles?.includes(UserRole.SUPER_ADMIN);

    const declaration = await this.ordersService.findDeclarationById(
      declarationId,
      ['clientProfile', 'clientProfile.user', 'files', 'pricing'],
    );

    if (
      !isAdmin &&
      !isSuper &&
      declaration.clientProfile.user.id !== req.user.sub
    ) {
      throw new NotFoundException('Declaration not found or access denied.');
    }

    return declaration;
  }
  @Post(':declarationId/submit')
  async submitDraft(
    @Param('declarationId') declarationId: string,
    @User() user: UserPayload,
  ): Promise<TaxDeclaration> {
    const userEntity = { id: user.sub } as any;
    return this.ordersService.submitDraft(declarationId, userEntity);
  }

  @Patch(':declarationId/steps')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
      [
        'clientProfile',
        'clientProfile.user',
        'clientProfile.user.profile',
        'assignedAdmin', // ← added
      ],
    );
    if (!declaration) throw new NotFoundException('Declaration not found');

    const roles = req.user?.roles ?? [];
    const isStaff =
      roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN);

    if (declaration.clientProfile?.user?.id !== userId && !isStaff) {
      throw new ForbiddenException(
        'Not allowed to comment on this declaration',
      );
    }

    const steps: any[] = Array.isArray(declaration.steps)
      ? declaration.steps
      : [];
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) throw new NotFoundException('Step not found');

    const now = new Date().toISOString();
    const existingMeta = steps[stepIndex].meta ?? {};

    const newComment = { text: body.comment, by: userId, at: now };
    const newMeta = {
      ...existingMeta,
      lastComment: newComment,
      commentHistory: [...(existingMeta.commentHistory ?? []), newComment],
    };

    steps[stepIndex] = { ...steps[stepIndex], meta: newMeta };
    declaration.steps = steps;

    await this.ordersService.saveDeclaration(declarationId, { steps });

    // ── Enrich history for response ──────────────────────────────────────────
    const authorIds: string[] = Array.from(
      new Set(newMeta.commentHistory.map((c: any) => c.by)),
    );
    const users = await this.userService.findByIds(authorIds);
    const userMap = Object.fromEntries(
      users.map((u) => [
        u.id,
        { email: u.email, name: u.profile?.firstName ?? '' },
      ]),
    );
    const enrichedHistory = newMeta.commentHistory.map((c: any) => ({
      ...c,
      byEmail: userMap[c.by]?.email ?? 'Unknown',
      byName: userMap[c.by]?.name ?? null,
    }));

    // ── Email notifications ──────────────────────────────────────────────────
    try {
      if (isStaff) {
        // Admin commented → notify the client
        const clientUser = declaration.clientProfile?.user;
        if (clientUser?.email) {
          await this.emailService.sendNewCommentNotificationToClient({
            clientEmail: clientUser.email,
            clientFirstName: clientUser.profile?.firstName,
            declarationId,
            stepId,
            commentText: body.comment,
          });
        }
      } else {
        // Client commented → notify assigned admin only ← changed
        const clientFirstName =
          declaration.clientProfile?.user?.profile?.firstName;

        if (declaration.assignedAdmin?.email) {
          await this.emailService.sendNewCommentNotificationToAdmin({
            adminEmail: declaration.assignedAdmin.email,
            clientFirstName,
            declarationId,
            stepId,
            commentText: body.comment,
          });
        }
      }
    } catch (err) {
      console.error('Failed to send comment notification email', err);
    }

    return {
      ok: true,
      meta: {
        ...newMeta,
        commentHistory: enrichedHistory,
      },
    };
  }
  @Post(':declarationId/steps/documentsPreparation/confirm')
  async confirmStep1(
    @Param('declarationId', ParseUUIDPipe) declarationId: string,
    @User('sub') userId: string,
  ) {
    return this.ordersService.confirmStep1(declarationId, userId);
  }
}
