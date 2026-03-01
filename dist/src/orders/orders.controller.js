"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const order_service_1 = require("./order.service");
const user_decorator_1 = require("../auth/user.decorator");
const roles_guard_1 = require("../auth/roles.guard");
const update_step_dto_1 = require("./dto/update-step.dto");
const user_entity_1 = require("../users/user.entity");
const add_step_comment_dto_1 = require("./dto/add-step-comment.dto");
const users_service_1 = require("../users/users.service");
const email_service_1 = require("../email/email.service");
let OrdersController = class OrdersController {
    ordersService;
    userService;
    emailService;
    constructor(ordersService, userService, emailService) {
        this.ordersService = ordersService;
        this.userService = userService;
        this.emailService = emailService;
    }
    async createDraft(req) {
        return this.ordersService.findOrCreateDraft(req.user.sub);
    }
    async getMyDeclarations(req) {
        return this.ordersService.findAllByUserId(req.user.sub);
    }
    async getDeclarationDetails(declarationId, req) {
        const isAdmin = req.user.roles?.includes(user_entity_1.UserRole.ADMIN);
        const isSuper = req.user.roles?.includes(user_entity_1.UserRole.SUPER_ADMIN);
        const declaration = await this.ordersService.findDeclarationById(declarationId, ['clientProfile', 'clientProfile.user', 'files', 'pricing']);
        if (!isAdmin &&
            !isSuper &&
            declaration.clientProfile.user.id !== req.user.sub) {
            throw new common_1.NotFoundException('Declaration not found or access denied.');
        }
        return declaration;
    }
    async submitDraft(declarationId, user) {
        const userEntity = { id: user.sub };
        return this.ordersService.submitDraft(declarationId, userEntity);
    }
    async updateStep(declarationId, body, adminId) {
        return this.ordersService.updateStep(declarationId, body.step, body.status, adminId, { note: body.note });
    }
    async confirmDownload(declarationId, stepId, userId, body = {}) {
        return this.ordersService.confirmDownloadByUser(declarationId, stepId, userId, body.fileId);
    }
    async addStepComment(declarationId, stepId, body, req, userId) {
        const declaration = await this.ordersService.findDeclarationById(declarationId, ['clientProfile', 'clientProfile.user', 'clientProfile.user.profile']);
        if (!declaration)
            throw new common_1.NotFoundException('Declaration not found');
        const roles = req.user?.roles ?? [];
        const isStaff = roles.includes(user_entity_1.UserRole.ADMIN) || roles.includes(user_entity_1.UserRole.SUPER_ADMIN);
        if (declaration.clientProfile?.user?.id !== userId && !isStaff) {
            throw new common_1.ForbiddenException('Not allowed to comment on this declaration');
        }
        const steps = Array.isArray(declaration.steps)
            ? declaration.steps
            : [];
        const stepIndex = steps.findIndex((s) => s.id === stepId);
        if (stepIndex === -1)
            throw new common_1.NotFoundException('Step not found');
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
        const authorIds = Array.from(new Set(newMeta.commentHistory.map((c) => c.by)));
        const users = await this.userService.findByIds(authorIds);
        const userMap = Object.fromEntries(users.map((u) => [
            u.id,
            { email: u.email, name: u.profile?.firstName ?? '' },
        ]));
        const enrichedHistory = newMeta.commentHistory.map((c) => ({
            ...c,
            byEmail: userMap[c.by]?.email ?? 'Unknown',
            byName: userMap[c.by]?.name ?? null,
        }));
        try {
            if (isStaff) {
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
            }
            else {
                const [admins, superAdmins] = await Promise.all([
                    this.userService.findByRole(user_entity_1.UserRole.ADMIN),
                    this.userService.findByRole(user_entity_1.UserRole.SUPER_ADMIN),
                ]);
                const staffToNotify = [...admins, ...superAdmins];
                const clientFirstName = declaration.clientProfile?.user?.profile?.firstName;
                await Promise.all(staffToNotify.map((admin) => this.emailService.sendNewCommentNotificationToAdmin({
                    adminEmail: admin.email,
                    clientFirstName,
                    declarationId,
                    stepId,
                    commentText: body.comment,
                })));
            }
        }
        catch (err) {
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
    async confirmStep1(declarationId, userId) {
        return this.ordersService.confirmStep1(declarationId, userId);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)('draft'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "createDraft", null);
__decorate([
    (0, common_1.Get)('my-declarations'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getMyDeclarations", null);
__decorate([
    (0, common_1.Get)(':declarationId'),
    __param(0, (0, common_1.Param)('declarationId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getDeclarationDetails", null);
__decorate([
    (0, common_1.Post)(':declarationId/submit'),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "submitDraft", null);
__decorate([
    (0, common_1.Patch)(':declarationId/steps'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, transform: true })),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_step_dto_1.UpdateStepDto, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateStep", null);
__decorate([
    (0, common_1.Post)(':declarationId/steps/:stepId/confirm-download'),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, common_1.Param)('stepId')),
    __param(2, (0, user_decorator_1.User)('sub')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "confirmDownload", null);
__decorate([
    (0, common_1.Post)(':declarationId/steps/:stepId/comment'),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, common_1.Param)('stepId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, add_step_comment_dto_1.AddStepCommentDto, Object, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "addStepComment", null);
__decorate([
    (0, common_1.Post)(':declarationId/steps/documentsPreparation/confirm'),
    __param(0, (0, common_1.Param)('declarationId', common_1.ParseUUIDPipe)),
    __param(1, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "confirmStep1", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [order_service_1.OrdersService,
        users_service_1.UsersService,
        email_service_1.EmailService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map