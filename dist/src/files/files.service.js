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
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const file_entity_1 = require("./file.entity");
const order_service_1 = require("../orders/order.service");
const minio_service_1 = require("../minio/minio.service");
const clamav_service_1 = require("../clamav/clamav.service");
const steps_1 = require("../types/steps");
const user_entity_1 = require("../users/user.entity");
const users_service_1 = require("../users/users.service");
const crypto_1 = require("crypto");
const step1_questions_1 = require("./step1/step1.questions");
let FilesService = class FilesService {
    filesRepository;
    ordersService;
    minioService;
    userService;
    clamAVService;
    constructor(filesRepository, ordersService, minioService, userService, clamAVService) {
        this.filesRepository = filesRepository;
        this.ordersService = ordersService;
        this.minioService = minioService;
        this.userService = userService;
        this.clamAVService = clamAVService;
    }
    async saveFileToStorage(file) {
        const ext = file.originalname.split('.').pop();
        const objectName = `files/${Date.now()}-${(0, crypto_1.randomUUID)()}.${ext}`;
        await this.minioService.uploadFile(objectName, file.buffer, file.mimetype);
        return objectName;
    }
    isStaff(roles) {
        const r = (roles ?? []);
        return (r.includes(user_entity_1.UserRole.ADMIN) ||
            r.includes(user_entity_1.UserRole.SUPER_ADMIN) ||
            r.includes('admin') ||
            r.includes('SUPER_ADMIN'));
    }
    async uploadFile(userId, declarationId, file, documentType, actorIsStaff = false, deliveredForStep) {
        const declaration = await this.ordersService.findDeclarationById(declarationId);
        const ownerUserId = declaration.clientProfile?.user?.id;
        if (!actorIsStaff && ownerUserId !== userId) {
            throw new common_1.ForbiddenException('Access to this declaration is forbidden.');
        }
        if (!actorIsStaff &&
            (!deliveredForStep || deliveredForStep === 'documentsPreparation')) {
            await this.ensureStep1Editable(declarationId, actorIsStaff);
            await this.reopenStep1IfConfirmed(declarationId, userId);
            await this.ensureStep1Started(declarationId, userId);
        }
        const storagePath = await this.saveFileToStorage(file);
        const savedMeta = {
            ...(file.meta ?? {}),
            deliveredForStep: deliveredForStep ?? null,
            uploadedBy: userId,
            uploaderRole: actorIsStaff ? 'admin' : 'user',
        };
        const fileEntity = this.filesRepository.create({
            originalName: file.originalname,
            storagePath,
            mimetype: file.mimetype,
            size: file.size,
            declaration,
            documentType,
            meta: savedMeta,
        });
        const savedFile = await this.filesRepository.save(fileEntity);
        const steps = Array.isArray(declaration.steps)
            ? declaration.steps
            : this.ordersService.getDefaultSteps();
        const step = steps.find((s) => s.id === 'documentsPreparation');
        if (step && step.status === steps_1.StepStatus.DONE) {
            return savedFile;
        }
        if (actorIsStaff) {
            if (deliveredForStep) {
                await this.ordersService.updateStep(declarationId, deliveredForStep, steps_1.StepStatus.IN_PROGRESS, userId, { adminFile: savedFile.id });
            }
            else {
                await this.ordersService.updateStep(declarationId, 'adminUploads', steps_1.StepStatus.IN_PROGRESS, userId, { adminFile: savedFile.id });
            }
        }
        return savedFile;
    }
    async getFileUrl(fileId, requestingUserId) {
        const file = await this.filesRepository.findOne({
            where: { id: fileId },
            relations: [
                'declaration',
                'declaration.clientProfile',
                'declaration.clientProfile.user',
            ],
        });
        if (!file) {
            throw new common_1.NotFoundException('File not found.');
        }
        const declaration = file.declaration;
        const ownerUserId = declaration?.clientProfile?.user?.id;
        if (requestingUserId !== ownerUserId) {
            const requestingUser = await this.userService.findOneById(requestingUserId);
            const isStaff = this.isStaff(requestingUser?.roles);
            if (!isStaff) {
                throw new common_1.ForbiddenException('Not allowed to download this file.');
            }
            return this.minioService.getPresignedUrl(file.storagePath);
        }
        const deliveredForStep = file.meta?.deliveredForStep;
        const alreadyDownloaded = file.meta?.downloadedBy;
        if (deliveredForStep && !alreadyDownloaded) {
            file.meta = {
                ...(file.meta ?? {}),
                downloadedBy: requestingUserId,
                downloadedAt: new Date().toISOString(),
            };
            await this.filesRepository.save(file);
        }
        const exists = await this.minioService.objectExists(file.storagePath);
        console.log('Object exists in MinIO:', exists, file.storagePath);
        if (!exists) {
            console.error(`MinIO object missing: ${file.storagePath} for file id ${file.id}`);
            throw new common_1.NotFoundException('File not found in storage (object missing).');
        }
        return this.minioService.getPresignedUrl(file.storagePath);
    }
    async uploadMultipleFiles(userId, declarationId, files, documentType) {
        await this.ensureStep1Editable(declarationId, false);
        await this.reopenStep1IfConfirmed(declarationId, userId);
        await this.ensureStep1Started(declarationId, userId);
        const concurrency = 4;
        const savedFiles = [];
        const failed = [];
        for (let i = 0; i < files.length; i += concurrency) {
            const batch = files.slice(i, i + concurrency);
            const results = await Promise.allSettled(batch.map((file) => this.uploadFile(userId, declarationId, file, documentType)));
            results.forEach((r, idx) => {
                if (r.status === 'fulfilled')
                    savedFiles.push(r.value);
                else
                    failed.push({ fileName: batch[idx].originalname, reason: r.reason });
            });
        }
        try {
            const decl = await this.ordersService.findDeclarationById(declarationId);
            const existingStep = decl.steps?.find((s) => s.id === 'documentsPreparation');
            const existingFileIds = existingStep?.meta?.files ?? [];
            await this.ordersService.updateStep(declarationId, 'documentsPreparation', existingStep?.status ?? steps_1.StepStatus.IN_PROGRESS, userId, { files: [...existingFileIds, ...savedFiles.map((f) => f.id)] });
        }
        catch (err) {
            console.error('Failed to update step metadata after multiple uploads', err);
        }
        return { saved: savedFiles, failed };
    }
    async uploadDraftForReviewStep(adminId, declarationId, file) {
        const declaration = await this.ordersService.findDeclarationById(declarationId);
        if (!declaration)
            throw new common_1.NotFoundException('Declaration not found');
        const storagePath = await this.saveFileToStorage(file);
        const fileEntity = this.filesRepository.create({
            originalName: file.originalname,
            storagePath,
            mimetype: file.mimetype,
            size: file.size,
            declaration,
            documentType: 'final_draft',
            meta: {
                deliveredForStep: 'reviewAndValidation',
                uploadedBy: adminId,
                uploaderRole: 'admin',
            },
        });
        return this.filesRepository.save(fileEntity);
    }
    async markDocumentMissing(userId, declarationId, documentType, reason) {
        const declaration = await this.ordersService.findDeclarationById(declarationId, ['clientProfile', 'clientProfile.user', 'files']);
        if (!declaration)
            throw new common_1.NotFoundException('Declaration not found');
        const ownerUserId = declaration.clientProfile?.user?.id;
        if (ownerUserId !== userId) {
            throw new common_1.ForbiddenException('Access to this declaration is forbidden.');
        }
        await this.ensureStep1Editable(declarationId, false);
        const steps = Array.isArray(declaration.steps)
            ? declaration.steps
            : this.ordersService.getDefaultSteps();
        const idx = steps.findIndex((s) => s.id === 'documentsPreparation');
        if (idx === -1) {
            throw new common_1.BadRequestException('documentsPreparation step not found.');
        }
        const existingMeta = steps[idx].meta ?? {};
        const existingMissing = existingMeta.missingDocs ?? [];
        const now = new Date().toISOString();
        const updatedMissing = [
            ...existingMissing.filter((m) => m.documentType !== documentType),
            {
                documentType,
                reason: reason ?? null,
                declaredBy: userId,
                declaredAt: now,
            },
        ];
        steps[idx] = {
            ...steps[idx],
            meta: {
                ...existingMeta,
                missingDocs: updatedMissing,
            },
        };
        await this.ordersService.saveDeclaration(declarationId, { steps });
        await this.reopenStep1IfConfirmed(declarationId, userId);
        await this.ensureStep1Started(declarationId, userId);
    }
    async unmarkDocumentMissing(userId, declarationId, documentType) {
        const declaration = await this.ordersService.findDeclarationById(declarationId, ['clientProfile', 'clientProfile.user', 'files']);
        if (!declaration)
            throw new common_1.NotFoundException('Declaration not found');
        const ownerUserId = declaration.clientProfile?.user?.id;
        if (ownerUserId !== userId)
            throw new common_1.ForbiddenException('Access forbidden');
        await this.ensureStep1Editable(declarationId, false);
        const steps = Array.isArray(declaration.steps)
            ? declaration.steps
            : this.ordersService.getDefaultSteps();
        const idx = steps.findIndex((s) => s.id === 'documentsPreparation');
        if (idx === -1)
            throw new common_1.BadRequestException('documentsPreparation step not found.');
        const meta = steps[idx].meta ?? {};
        const existingMissing = meta.missingDocs ?? [];
        steps[idx] = {
            ...steps[idx],
            meta: {
                ...meta,
                missingDocs: existingMissing.filter((m) => m.documentType !== documentType),
            },
        };
        const currentStepStatus = steps[idx].status;
        if (currentStepStatus === steps_1.StepStatus.DONE) {
            await this.ordersService.saveDeclaration(declarationId, { steps });
        }
        else {
            steps[idx].status = steps_1.StepStatus.DONE;
            await this.ordersService.saveDeclaration(declarationId, { steps });
        }
        return { ok: true };
    }
    async saveStep1Answers(userId, declarationId, answers) {
        const declaration = await this.ordersService.findDeclarationById(declarationId, ['clientProfile']);
        if (!declaration)
            throw new common_1.NotFoundException('Declaration not found');
        const ownerUserId = declaration.clientProfile?.user?.id;
        if (ownerUserId !== userId) {
            throw new common_1.ForbiddenException('Access to this declaration is forbidden.');
        }
        await this.ensureStep1Editable(declarationId, false);
        const safeAnswers = this.sanitizeStep1Answers(answers);
        const snapshot = declaration.questionnaireSnapshot ?? {};
        snapshot.step1Answers = {
            ...(snapshot.step1Answers ?? {}),
            ...safeAnswers,
        };
        await this.ordersService.saveDeclaration(declarationId, {
            questionnaireSnapshot: snapshot,
        });
        await this.reopenStep1IfConfirmed(declarationId, userId);
        await this.ensureStep1Started(declarationId, userId);
    }
    async getStep1Answers(userId, roles, declarationId) {
        const declaration = await this.ordersService.findDeclarationById(declarationId, ['clientProfile', 'clientProfile.user']);
        if (!declaration)
            throw new common_1.NotFoundException('Declaration not found');
        const isAdmin = this.isStaff(roles);
        if (!isAdmin) {
            const ownerUserId = declaration.clientProfile?.user?.id;
            if (ownerUserId !== userId)
                throw new common_1.ForbiddenException('Forbidden');
        }
        return declaration.questionnaireSnapshot?.step1Answers ?? {};
    }
    async deleteFile(userId, fileId) {
        const file = await this.filesRepository.findOne({
            where: { id: fileId },
            relations: [
                'declaration',
                'declaration.clientProfile',
                'declaration.clientProfile.user',
            ],
        });
        if (!file)
            throw new common_1.NotFoundException('File not found.');
        const ownerUserId = file.declaration?.clientProfile?.user?.id;
        if (ownerUserId !== userId) {
            throw new common_1.ForbiddenException('Not allowed to delete this file.');
        }
        await this.ensureStep1Editable(file.declaration.id, false);
        if (file.storagePath) {
            await this.minioService.removeFile(file.storagePath);
        }
        await this.filesRepository.remove(file);
        await this.reopenStep1IfConfirmed(file.declaration.id, userId);
        await this.ensureStep1Started(file.declaration.id, userId);
    }
    async reopenStep1IfConfirmed(declarationId, actorUserId) {
        const decl = await this.ordersService.findDeclarationById(declarationId);
        const step = (decl.steps ?? []).find((s) => s.id === 'documentsPreparation');
        if (!step)
            return;
        if (step.status === steps_1.StepStatus.DONE) {
            await this.ordersService.updateStep(declarationId, 'documentsPreparation', steps_1.StepStatus.IN_PROGRESS, actorUserId, {
                confirmedAt: null,
                confirmedBy: null,
                reopenedAt: new Date().toISOString(),
                reopenedBy: actorUserId,
            });
        }
    }
    async ensureStep1Started(declarationId, actorUserId) {
        const decl = await this.ordersService.findDeclarationById(declarationId);
        const step = (decl.steps ?? []).find((s) => s.id === 'documentsPreparation');
        if (!step)
            return;
        if (step.status === steps_1.StepStatus.PENDING) {
            await this.ordersService.updateStep(declarationId, 'documentsPreparation', steps_1.StepStatus.IN_PROGRESS, actorUserId, {
                startedAt: new Date().toISOString(),
                startedBy: actorUserId,
            });
        }
    }
    async ensureStep1Editable(declarationId, actorIsStaff) {
        if (actorIsStaff)
            return;
        const decl = await this.ordersService.findDeclarationById(declarationId);
        const reviewStep = (decl.steps ?? []).find((s) => s.id === 'documentsReview');
        if (reviewStep?.status === steps_1.StepStatus.DONE) {
            throw new common_1.ForbiddenException('Step 1 is locked because documents were approved.');
        }
    }
    sanitizeStep1Answers(input) {
        const defs = new Map(step1_questions_1.STEP1_QUESTIONS.map((q) => [q.id, q]));
        const out = {};
        for (const [key, raw] of Object.entries(input ?? {})) {
            const def = defs.get(key);
            if (!def) {
                throw new common_1.BadRequestException(`Unknown Step 1 field: ${key}`);
            }
            if (raw === null || raw === undefined || raw === '') {
                out[key] = '';
                continue;
            }
            if (def.type === 'number') {
                const n = Number(raw);
                if (!Number.isFinite(n)) {
                    throw new common_1.BadRequestException(`Invalid number for ${key}`);
                }
                if (def.min !== undefined && n < def.min) {
                    throw new common_1.BadRequestException(`${key} must be >= ${def.min}`);
                }
                if (def.max !== undefined && n > def.max) {
                    throw new common_1.BadRequestException(`${key} must be <= ${def.max}`);
                }
                out[key] = n;
                continue;
            }
            if (def.type === 'select') {
                const allowed = new Set((def.options ?? []).map((o) => o.value));
                const v = String(raw);
                if (!allowed.has(v)) {
                    throw new common_1.BadRequestException(`Invalid option for ${key}`);
                }
                out[key] = v;
                continue;
            }
            out[key] = String(raw).trim();
        }
        return out;
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(file_entity_1.File)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        order_service_1.OrdersService,
        minio_service_1.MinioService,
        users_service_1.UsersService,
        clamav_service_1.ClamAVService])
], FilesService);
//# sourceMappingURL=files.service.js.map