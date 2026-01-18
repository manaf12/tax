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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const files_service_1 = require("./files.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const multer_1 = require("multer");
const user_decorator_1 = require("../auth/user.decorator");
const multer = __importStar(require("multer"));
let FilesController = class FilesController {
    filesService;
    constructor(filesService) {
        this.filesService = filesService;
    }
    async uploadFile(declarationId, file, userId, documentType, deliveredForStep) {
        if (!file) {
            throw new common_1.NotFoundException('File not provided in the request.');
        }
        return this.filesService.uploadFile(userId, declarationId, file, documentType, false, deliveredForStep);
    }
    async getFileUrl(fileId, userId) {
        const url = await this.filesService.getFileUrl(fileId, userId);
        return { url };
    }
    async uploadMultiple(declarationId, files, userId, documentType) {
        return this.filesService.uploadMultipleFiles(userId, declarationId, files, documentType);
    }
    async markMissing(declarationId, docType, userId, body) {
        await this.filesService.markDocumentMissing(userId, declarationId, docType, body?.reason);
        return { ok: true };
    }
    async saveStep1Answers(declarationId, userId, body) {
        if (!body?.answers || typeof body.answers !== 'object') {
            throw new common_1.BadRequestException('Answers payload is required.');
        }
        await this.filesService.saveStep1Answers(userId, declarationId, body.answers);
        return { ok: true };
    }
    async unmarkMissing(declarationId, docType, userId) {
        await this.filesService.unmarkDocumentMissing(userId, declarationId, docType);
        return { ok: true };
    }
    async getStep1Answers(declarationId, userId, roles = []) {
        const answers = await this.filesService.getStep1Answers(userId, roles, declarationId);
        return { answers };
    }
    async deleteFile(fileId, userId) {
        await this.filesService.deleteFile(userId, fileId);
        return { ok: true };
    }
};
exports.FilesController = FilesController;
__decorate([
    (0, common_1.Post)(':declarationId/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: multer.memoryStorage(),
        fileFilter: (req, file, cb) => {
            if (file.mimetype !== 'application/pdf')
                return cb(new common_1.BadRequestException('Only PDFs allowed'), false);
            cb(null, true);
        },
        limits: {
            fileSize: 1 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, user_decorator_1.User)('sub')),
    __param(3, (0, common_1.Body)('documentType')),
    __param(4, (0, common_1.Body)('deliveredForStep')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_a = typeof multer_1.File !== "undefined" && multer_1.File) === "function" ? _a : Object, String, String, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Get)(':fileId/url'),
    __param(0, (0, common_1.Param)('fileId', common_1.ParseUUIDPipe)),
    __param(1, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "getFileUrl", null);
__decorate([
    (0, common_1.Post)(':declarationId/upload-multiple'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 30, {
        storage: multer.memoryStorage(),
        fileFilter: (req, file, cb) => {
            if (file.mimetype !== 'application/pdf') {
                return cb(new common_1.BadRequestException('Only PDF files allowed'), false);
            }
            cb(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('declarationId')),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, user_decorator_1.User)('sub')),
    __param(3, (0, common_1.Body)('documentType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, String, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "uploadMultiple", null);
__decorate([
    (0, common_1.Post)(':declarationId/documents/:docType/missing'),
    __param(0, (0, common_1.Param)('declarationId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('docType')),
    __param(2, (0, user_decorator_1.User)('sub')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "markMissing", null);
__decorate([
    (0, common_1.Post)(':declarationId/step1/answers'),
    __param(0, (0, common_1.Param)('declarationId', common_1.ParseUUIDPipe)),
    __param(1, (0, user_decorator_1.User)('sub')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "saveStep1Answers", null);
__decorate([
    (0, common_1.Delete)(':declarationId/documents/:docType/missing'),
    __param(0, (0, common_1.Param)('declarationId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('docType')),
    __param(2, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "unmarkMissing", null);
__decorate([
    (0, common_1.Get)(':declarationId/step1/answers'),
    __param(0, (0, common_1.Param)('declarationId', common_1.ParseUUIDPipe)),
    __param(1, (0, user_decorator_1.User)('sub')),
    __param(2, (0, user_decorator_1.User)('roles')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Array]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "getStep1Answers", null);
__decorate([
    (0, common_1.Delete)(':fileId'),
    __param(0, (0, common_1.Param)('fileId', common_1.ParseUUIDPipe)),
    __param(1, (0, user_decorator_1.User)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "deleteFile", null);
exports.FilesController = FilesController = __decorate([
    (0, common_1.Controller)('files'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], FilesController);
//# sourceMappingURL=files.controller.js.map