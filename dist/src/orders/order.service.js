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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tax_declaration_entity_1 = require("./tax-declaration.entity");
const users_service_1 = require("../users/users.service");
const user_entity_1 = require("../users/user.entity");
const pricing_service_1 = require("../pricing/pricing.service");
const pricing_entity_1 = require("../pricing/pricing.entity");
const pricing_status_enum_1 = require("../pricing/pricing-status.enum");
const steps_1 = require("../types/steps");
let OrdersService = class OrdersService {
    declarationsRepository;
    usersService;
    pricingService;
    pricingRepository;
    dataSource;
    constructor(declarationsRepository, usersService, pricingService, pricingRepository, dataSource) {
        this.declarationsRepository = declarationsRepository;
        this.usersService = usersService;
        this.pricingService = pricingService;
        this.pricingRepository = pricingRepository;
        this.dataSource = dataSource;
    }
    getDefaultSteps() {
        return [
            {
                id: 'documentsPreparation',
                order: 1,
                nameKey: 'steps.documentsPreparation',
                status: steps_1.StepStatus.PENDING,
            },
            {
                id: 'documentsReview',
                order: 2,
                nameKey: 'steps.documentsReview',
                status: steps_1.StepStatus.PENDING,
            },
            {
                id: 'taxPreparation',
                order: 3,
                nameKey: 'steps.taxPreparation',
                status: steps_1.StepStatus.PENDING,
            },
            {
                id: 'reviewAndValidation',
                order: 4,
                nameKey: 'steps.reviewAndValidation',
                status: steps_1.StepStatus.PENDING,
            },
            {
                id: 'submission',
                order: 5,
                nameKey: 'steps.submission',
                status: steps_1.StepStatus.PENDING,
            },
        ];
    }
    async findDeclarationById(declarationId, relations = []) {
        const defaultRelations = ['clientProfile', 'clientProfile.user', 'files'];
        const finalRelations = [...new Set([...defaultRelations, ...relations])];
        const declaration = await this.declarationsRepository.findOne({
            where: { id: declarationId },
            relations: finalRelations,
        });
        if (!declaration) {
            throw new common_1.NotFoundException('Tax Declaration not found.');
        }
        return declaration;
    }
    async findOne(declarationId) {
        return this.findDeclarationById(declarationId, [
            'clientProfile',
            'clientProfile.user',
        ]);
    }
    async findOrCreateDraft(userId) {
        const user = await this.usersService.findOneWithProfile(userId);
        if (!user || !user.profile) {
            throw new common_1.NotFoundException('Client profile not found.');
        }
        let draftDeclaration = await this.declarationsRepository.findOne({
            where: {
                clientProfile: { id: user.profile.id },
                status: tax_declaration_entity_1.DeclarationStatus.DRAFT,
            },
            relations: ['clientProfile', 'clientProfile.user'],
        });
        if (!draftDeclaration) {
            draftDeclaration = this.declarationsRepository.create({
                clientProfile: user.profile,
                status: tax_declaration_entity_1.DeclarationStatus.DRAFT,
            });
            await this.declarationsRepository.save(draftDeclaration);
        }
        return draftDeclaration;
    }
    async submitDraft(declarationId, user) {
        const declaration = await this.findDeclarationById(declarationId, [
            'clientProfile',
            'clientProfile.user',
        ]);
        if (declaration.clientProfile.user.id !== user.id) {
            throw new common_1.ForbiddenException('You do not own this declaration.');
        }
        if (declaration.status !== tax_declaration_entity_1.DeclarationStatus.DRAFT) {
            throw new common_1.BadRequestException(`Cannot submit draft in status: ${declaration.status}. Expected status: ${tax_declaration_entity_1.DeclarationStatus.DRAFT}`);
        }
        declaration.status = tax_declaration_entity_1.DeclarationStatus.PENDING_PRICING;
        return this.declarationsRepository.save(declaration);
    }
    async setPricing(declarationId, adminUser, pricingData) {
        if (!adminUser.roles.includes(user_entity_1.UserRole.ADMIN)) {
            throw new common_1.ForbiddenException('Only administrators can set pricing.');
        }
        const declaration = await this.findDeclarationById(declarationId, [
            'pricing',
        ]);
        if (declaration.status !== tax_declaration_entity_1.DeclarationStatus.PENDING_PRICING) {
            throw new common_1.BadRequestException(`Cannot set pricing in status: ${declaration.status}.`);
        }
        await this.pricingService.createOrUpdatePricing(declaration, pricingData);
        declaration.status = tax_declaration_entity_1.DeclarationStatus.PRICING_ACCEPTED;
        return this.declarationsRepository.save(declaration);
    }
    async acceptPricing(declarationId, userId) {
        const declaration = await this.findDeclarationById(declarationId, [
            'clientProfile',
            'clientProfile.user',
        ]);
        if (declaration.clientProfile.user.id !== userId) {
            throw new common_1.ForbiddenException('You do not own this declaration.');
        }
        if (declaration.status !== tax_declaration_entity_1.DeclarationStatus.PRICING_ACCEPTED) {
            throw new common_1.BadRequestException(`Cannot accept pricing in status: ${declaration.status}. Expected status: ${tax_declaration_entity_1.DeclarationStatus.PRICING_ACCEPTED}`);
        }
        declaration.status = tax_declaration_entity_1.DeclarationStatus.PENDING_PAYMENT;
        return this.declarationsRepository.save(declaration);
    }
    async markAsPaid(declarationId) {
        const declaration = await this.findDeclarationById(declarationId, [
            'clientProfile',
            'clientProfile.user',
        ]);
        if (declaration.status !== tax_declaration_entity_1.DeclarationStatus.PENDING_PAYMENT) {
            throw new common_1.BadRequestException(`Cannot mark as paid in status: ${declaration.status}. Expected status: ${tax_declaration_entity_1.DeclarationStatus.PENDING_PAYMENT}`);
        }
        declaration.status = tax_declaration_entity_1.DeclarationStatus.IN_REVIEW;
        return this.declarationsRepository.save(declaration);
    }
    async markAsCompleted(declarationId, adminId) {
        const adminUser = await this.usersService.findOneById(adminId);
        if (!adminUser) {
            throw new common_1.NotFoundException('Admin user not found.');
        }
        if (!adminUser.roles.includes(user_entity_1.UserRole.ADMIN)) {
            throw new common_1.ForbiddenException('Only administrators can complete a declaration.');
        }
        const declaration = await this.findDeclarationById(declarationId, [
            'clientProfile',
            'clientProfile.user',
        ]);
        if (declaration.status !== tax_declaration_entity_1.DeclarationStatus.IN_REVIEW) {
            throw new common_1.BadRequestException(`Cannot complete declaration in status: ${declaration.status}. Expected status: ${tax_declaration_entity_1.DeclarationStatus.IN_REVIEW}`);
        }
        declaration.status = tax_declaration_entity_1.DeclarationStatus.COMPLETED;
        return this.declarationsRepository.save(declaration);
    }
    async linkDeclarationToUser(userId, tempDeclarationId) {
        const user = await this.usersService.findOneWithProfile(userId);
        if (!user || !user.profile) {
            throw new common_1.NotFoundException('User or client profile not found.');
        }
        const tempDeclaration = await this.declarationsRepository.findOneBy({
            id: tempDeclarationId,
        });
        if (!tempDeclaration) {
            throw new common_1.NotFoundException('Temporary declaration not found.');
        }
        if (tempDeclaration.clientProfile) {
            throw new common_1.ForbiddenException('Declaration is already linked to a user.');
        }
        tempDeclaration.clientProfile = user.profile;
        await this.declarationsRepository.save(tempDeclaration);
    }
    async findAllByUserId(userId) {
        return this.declarationsRepository.find({
            where: {
                clientProfile: {
                    user: { id: userId },
                },
            },
            relations: ['clientProfile', 'clientProfile.user', 'pricing', 'files'],
            order: {
                createdAt: 'DESC',
            },
        });
    }
    async createDeclarationFromPricing(pricingId, userId) {
        const pricing = await this.pricingRepository.findOne({
            where: { id: pricingId },
            relations: ['questionnaireResponse'],
        });
        if (!pricing)
            throw new common_1.NotFoundException('Pricing not found.');
        const user = await this.usersService.findOneWithProfile(userId);
        if (!user || !user.profile) {
            throw new common_1.NotFoundException('User/profile not found');
        }
        return await this.dataSource.transaction(async (manager) => {
            const declRepo = manager.getRepository(tax_declaration_entity_1.TaxDeclaration);
            const pricingRepo = manager.getRepository(pricing_entity_1.Pricing);
            const draft = await declRepo.findOne({
                where: {
                    clientProfile: { id: user.profile.id },
                    status: tax_declaration_entity_1.DeclarationStatus.DRAFT,
                },
            });
            const snapshot = pricing.questionnaireResponse?.data ?? null;
            const offerFromSnapshot = snapshot?.offer ?? null;
            if (draft) {
                draft.pricing = pricing;
                draft.status = tax_declaration_entity_1.DeclarationStatus.PENDING_PAYMENT;
                draft.questionnaireSnapshot = snapshot ?? undefined;
                draft.offer = offerFromSnapshot;
                draft.currentStep = draft.currentStep ?? 1;
                draft.steps =
                    Array.isArray(draft.steps) && draft.steps.length
                        ? draft.steps
                        : this.getDefaultSteps();
                const saved = await declRepo.save(draft);
                pricing.declaration = saved;
                pricing.status =
                    typeof pricing_status_enum_1.PricingStatus !== 'undefined'
                        ? pricing_status_enum_1.PricingStatus.ACCEPTED
                        : 'ACCEPTED';
                await pricingRepo.save(pricing);
                return saved;
            }
            const declaration = declRepo.create();
            Object.assign(declaration, {
                clientProfile: user.profile,
                pricing: pricing,
                status: tax_declaration_entity_1.DeclarationStatus.PENDING_PAYMENT,
                questionnaireSnapshot: snapshot,
                offer: offerFromSnapshot,
                steps: this.getDefaultSteps(),
                currentStep: 1,
            });
            const savedDecl = await declRepo.save(declaration);
            pricing.declaration = savedDecl;
            pricing.status =
                typeof pricing_status_enum_1.PricingStatus !== 'undefined'
                    ? pricing_status_enum_1.PricingStatus.ACCEPTED
                    : 'ACCEPTED';
            await pricingRepo.save(pricing);
            return savedDecl;
        });
    }
    async updateStep(declarationId, stepId, status, actorId, extra) {
        const decl = await this.declarationsRepository.findOne({
            where: { id: declarationId },
        });
        if (!decl)
            throw new common_1.NotFoundException('Declaration not found');
        const steps = Array.isArray(decl.steps)
            ? decl.steps
            : this.getDefaultSteps();
        const idx = steps.findIndex((s) => s.id === stepId);
        if (idx === -1) {
            throw new common_1.BadRequestException('Invalid step id');
        }
        if (stepId === 'documentsPreparation' &&
            steps[idx].status === steps_1.StepStatus.DONE) {
            return decl;
        }
        steps[idx] = {
            ...steps[idx],
            status,
            updatedAt: new Date().toISOString(),
            updatedBy: actorId,
            meta: {
                ...(steps[idx].meta ?? {}),
                ...(extra ?? {}),
            },
        };
        const inProgress = steps.find((s) => s.status === steps_1.StepStatus.IN_PROGRESS);
        const firstNotDone = steps.find((s) => s.status !== steps_1.StepStatus.DONE);
        decl.currentStep = inProgress
            ? inProgress.order
            : firstNotDone
                ? firstNotDone.order
                : steps.length;
        decl.steps = steps;
        if (steps.every((s) => s.status === steps_1.StepStatus.DONE)) {
            decl.status = tax_declaration_entity_1.DeclarationStatus.COMPLETED;
        }
        else if (steps.some((s) => s.status === steps_1.StepStatus.IN_PROGRESS)) {
            decl.status = tax_declaration_entity_1.DeclarationStatus.IN_REVIEW;
        }
        return this.declarationsRepository.save(decl);
    }
    async initStepsIfEmpty(declarationId) {
        const decl = await this.declarationsRepository.findOne({
            where: { id: declarationId },
        });
        if (!decl)
            throw new common_1.NotFoundException('Declaration not found.');
        if (!Array.isArray(decl.steps) || decl.steps.length === 0) {
            decl.steps = this.getDefaultSteps();
            decl.currentStep = 1;
            await this.declarationsRepository.save(decl);
        }
        return decl;
    }
    async confirmDownloadByUser(declarationId, stepId, userId, fileId) {
        const decl = await this.findDeclarationById(declarationId, [
            'clientProfile',
            'clientProfile.user',
            'files',
        ]);
        if (decl.clientProfile.user.id !== userId) {
            throw new common_1.ForbiddenException('You do not own this declaration.');
        }
        if (fileId) {
            const file = decl.files?.find((f) => f.id === fileId);
            if (!file) {
                throw new common_1.BadRequestException('File not found in this declaration.');
            }
        }
        else {
            const hasStepFile = decl.files?.some((f) => f.meta?.deliveredForStep === stepId);
            if (!hasStepFile) {
                throw new common_1.BadRequestException('No file found for this step.');
            }
        }
        await this.updateStep(declarationId, stepId, steps_1.StepStatus.DONE, userId, {
            confirmedAt: new Date().toISOString(),
            fileId: fileId ?? null,
        });
        if (stepId === 'reviewAndValidation') {
            await this.declarationsRepository.update({ id: declarationId }, { currentStep: 5 });
            console.log(`Declaration ${declarationId} has been moved to step 5 after user confirmation.`);
        }
        return this.findDeclarationById(declarationId);
    }
    async saveDeclaration(declarationId, partial) {
        await this.declarationsRepository.update(declarationId, partial);
        return this.declarationsRepository.findOne({
            where: { id: declarationId },
        });
    }
    async addAdminFileToStep(declarationId, stepId, fileId) {
        const decl = await this.findDeclarationById(declarationId);
        const steps = decl.steps ?? [];
        const stepIndex = steps.findIndex((s) => s.id === stepId);
        if (stepIndex === -1) {
            console.warn(`Step with id ${stepId} not found for declaration ${declarationId}. Cannot add admin file.`);
            return;
        }
        const existingMeta = steps[stepIndex].meta ?? {};
        const newMeta = { ...existingMeta, draftFileId: fileId };
        steps[stepIndex] = { ...steps[stepIndex], meta: newMeta };
        await this.declarationsRepository.update({ id: declarationId }, { steps: steps });
    }
    async getCountsByCurrentStep() {
        const rows = await this.declarationsRepository
            .createQueryBuilder('d')
            .select('d.currentStep', 'currentStep')
            .addSelect('COUNT(*)', 'count')
            .groupBy('d.currentStep')
            .getRawMany();
        return rows.reduce((acc, r) => {
            const key = r.currentstep ?? r.currentStep ?? 'unknown';
            acc[key] = Number(r.count);
            return acc;
        }, {});
    }
    async listDeclarations(query) {
        const page = query.page ?? 1;
        const perPage = Math.min(query.perPage ?? 20, 100);
        const qb = this.declarationsRepository.createQueryBuilder('d');
        qb.leftJoinAndSelect('d.clientProfile', 'cp')
            .leftJoinAndSelect('cp.user', 'u')
            .leftJoinAndSelect('d.pricing', 'p')
            .leftJoinAndSelect('d.files', 'f');
        if (query.status)
            qb.andWhere('d.status = :status', { status: query.status });
        if (query.currentStep)
            qb.andWhere('d.currentStep = :cs', { cs: query.currentStep });
        if (query.assignedAdminId)
            qb.andWhere('d.assignedAdminId = :aid', { aid: query.assignedAdminId });
        if (query.search) {
            qb.andWhere('(u.email ILIKE :q OR u.fullName ILIKE :q OR d.id ILIKE :q)', { q: `%${query.search}%` });
        }
        qb.orderBy('d.createdAt', 'DESC')
            .skip((page - 1) * perPage)
            .take(perPage);
        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, perPage };
    }
    async assignDeclarationsToAdmin(declarationIds, adminId, assignedById, note) {
        return this.dataSource.transaction(async (manager) => {
            const declRepo = manager.getRepository(tax_declaration_entity_1.TaxDeclaration);
            const now = new Date().toISOString();
            const updated = [];
            for (const id of declarationIds) {
                const d = await declRepo.findOne({ where: { id } });
                if (!d)
                    continue;
                d.assignedAdminId = adminId;
                d.assignedAt = now;
                d.assignedById = assignedById;
                d.assignmentHistory = [
                    ...(d.assignmentHistory ?? []),
                    { adminId, assignedById, assignedAt: now, note },
                ];
                await declRepo.save(d);
                updated.push(d);
            }
            return updated;
        });
    }
    async confirmStep1(declarationId, userId) {
        const decl = await this.findDeclarationById(declarationId, [
            'clientProfile',
            'clientProfile.user',
            'files',
        ]);
        if (decl.clientProfile.user.id !== userId) {
            throw new common_1.ForbiddenException('You do not own this declaration.');
        }
        const steps = Array.isArray(decl.steps)
            ? decl.steps
            : this.getDefaultSteps();
        const step = steps.find((s) => s.id === 'documentsPreparation');
        if (!step)
            throw new common_1.BadRequestException('documentsPreparation step not found.');
        const uploadedDocTypes = new Set((decl.files ?? []).map((f) => f.documentType));
        const missingMeta = step.meta?.missingDocs ?? [];
        const missingDocTypes = new Set(missingMeta.map((m) => m.documentType));
        const REQUIRED_DOCUMENT_TYPES = [
            'salary_certificate',
            'bank_statement',
            'pillar_3_certificate',
            'property_deed_main',
            'property_deed_rental',
            'debt_statement',
            'medical_expense_receipt',
        ];
        const requiredQuestions = decl?.questionnaireSnapshot?.step1RequiredQuestions ?? [];
        const step1Answers = decl?.questionnaireSnapshot?.step1Answers ?? {};
        const missingDocs = REQUIRED_DOCUMENT_TYPES.filter((docType) => !uploadedDocTypes.has(docType) && !missingDocTypes.has(docType));
        const missingQuestions = requiredQuestions.filter((q) => {
            const v = step1Answers[q];
            return v === undefined || v === null || String(v).trim().length === 0;
        });
        if (missingDocs.length || missingQuestions.length) {
            throw new common_1.BadRequestException({
                message: 'Step 1 is not ready to be confirmed.',
                missingDocs,
                missingQuestions,
            });
        }
        await this.updateStep(declarationId, 'documentsPreparation', steps_1.StepStatus.DONE, userId, {
            confirmedAt: new Date().toISOString(),
            confirmedBy: userId,
        });
        return { ok: true };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tax_declaration_entity_1.TaxDeclaration)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => pricing_service_1.PricingService))),
    __param(3, (0, typeorm_1.InjectRepository)(pricing_entity_1.Pricing)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService,
        pricing_service_1.PricingService,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], OrdersService);
//# sourceMappingURL=order.service.js.map