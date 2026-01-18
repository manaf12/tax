"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_guard_1 = require("./../auth/admin.guard");
const jwt_auth_guard_1 = require("./../auth/jwt-auth.guard");
const users_service_1 = require("../users/users.service");
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const user_decorator_1 = require("../auth/user.decorator");
const files_service_1 = require("../files/files.service");
const platform_express_1 = require("@nestjs/platform-express");
const multer = __importStar(require("multer"));
const steps_1 = require("../types/steps");
const roles_guard_1 = require("../auth/roles.guard");
const user_entity_1 = require("../users/user.entity");
const roles_decorator_1 = require("../auth/roles.decorator");
const assign_declarations_dto_1 = require("./dto/assign-declarations.dto");
let AdminController = class AdminController {
    adminService;
    filesService;
    usersService;
    constructor(adminService, filesService, usersService) {
        this.adminService = adminService;
        this.filesService = filesService;
        this.usersService = usersService;
    }
    async getPaidDeclarations() {
        return this.adminService.getPaidDeclarations();
    }
    async completeDeclaration(declarationId, adminId) {
        return this.adminService.completeDeclaration(declarationId, adminId);
    }
    async getDeclarationDetails(declarationId) {
        return this.adminService.getDeclarationDetailsForAdmin(declarationId);
    }
    async reviewDeclaration(declarationId, adminId, body) {
        return this.adminService.reviewDeclaration(declarationId, adminId, body.status, body.note);
    }
    async uploadDraft(declarationId, file, adminId, documentType, stepId) {
        const savedFile = await this.filesService.uploadFile(adminId, declarationId, file, documentType, true, stepId);
        return {
            id: savedFile.id,
            originalName: savedFile.originalName,
            createdAt: savedFile.uploadedAt ?? savedFile.uploadedAt,
        };
    }
    async completeAdminStep(declarationId, stepId, adminId, body) {
        const meta = body?.note ? { note: body.note } : undefined;
        return this.adminService.updateDeclarationStep(declarationId, adminId, stepId, steps_1.StepStatus.DONE, meta);
    }
    async uploadStep3Draft(declarationId, file, adminId) {
        if (!file)
            throw new common_1.BadRequestException('File not provided.');
        return this.filesService.uploadDraftForReviewStep(adminId, declarationId, file);
    }
    async assign(body, assignedById) {
        const { declarationIds, adminId, note } = body;
        const updated = await this.adminService.assignDeclarations(declarationIds, adminId, assignedById, note);
        return { updatedCount: updated.length, updated };
    }
    getStepStats() {
        return this.adminService.getStepCounters();
    }
    async list(q, user) {
        if (user.isSuperAdmin) {
            return this.adminService.listDeclarations(q);
        }
        else {
            console.log('Admin accessing their own declarations');
            q.assignedAdminId = user.sub;
            return this.adminService.listDeclarations(q);
        }
    }
    async listAdmins() {
        return this.usersService.listAdmins();
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('paid'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPaidDeclarations", null);
__decorate([
    (0, common_1.Patch)(':declarationId/complete'),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "completeDeclaration", null);
__decorate([
    (0, common_1.Get)(':declarationId'),
    __param(0, (0, common_1.Param)('declarationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDeclarationDetails", null);
__decorate([
    (0, common_1.Patch)(':declarationId/review'),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, user_decorator_1.User)('sub')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "reviewDeclaration", null);
__decorate([
    (0, common_1.Post)(':declarationId/upload-draft'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { storage: multer.memoryStorage() })),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, user_decorator_1.User)('sub')),
    __param(3, (0, common_1.Body)('documentType')),
    __param(4, (0, common_1.Body)('stepId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "uploadDraft", null);
__decorate([
    (0, common_1.Patch)(':declarationId/steps/:stepId/complete'),
    __param(0, (0, common_1.Param)('declarationId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('stepId')),
    __param(2, (0, user_decorator_1.User)('sub')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "completeAdminStep", null);
__decorate([
    (0, common_1.Post)(':declarationId/step3-upload-draft'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "uploadStep3Draft", null);
__decorate([
    (0, common_1.Post)('assign'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assign_declarations_dto_1.AssignDeclarationsDto, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "assign", null);
__decorate([
    (0, common_1.Get)('stats/steps'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStepStats", null);
__decorate([
    (0, common_1.Get)(''),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('meta/admins'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPER_ADMIN, user_entity_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listAdmins", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    (0, common_1.Controller)('admin/declarations'),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        files_service_1.FilesService,
        users_service_1.UsersService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map