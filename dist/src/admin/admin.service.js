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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tax_declaration_entity_1 = require("../orders/tax-declaration.entity");
const order_service_1 = require("../orders/order.service");
const users_service_1 = require("../users/users.service");
const user_entity_1 = require("../users/user.entity");
let AdminService = class AdminService {
    taxDeclarationRepository;
    ordersService;
    usersService;
    constructor(taxDeclarationRepository, ordersService, usersService) {
        this.taxDeclarationRepository = taxDeclarationRepository;
        this.ordersService = ordersService;
        this.usersService = usersService;
    }
    async getPaidDeclarations() {
        return this.taxDeclarationRepository.find({
            where: { status: tax_declaration_entity_1.DeclarationStatus.IN_REVIEW },
            relations: ['clientProfile', 'files', 'pricing'],
        });
    }
    async completeDeclaration(declarationId, adminId) {
        return this.ordersService.markAsCompleted(declarationId, adminId);
    }
    async getDeclarationDetailsForAdmin(declarationId) {
        const declaration = await this.taxDeclarationRepository.findOne({
            where: { id: declarationId },
            relations: ['clientProfile', 'clientProfile.user', 'files', 'pricing'],
        });
        if (!declaration) {
            throw new common_1.NotFoundException(`Declaration with ID ${declarationId} not found.`);
        }
        return declaration;
    }
    async reviewDeclaration(declarationId, adminId, status, note) {
        const decl = await this.getDeclarationDetailsForAdmin(declarationId);
        const updatedDecl = await this.ordersService.updateStep(declarationId, 'documentsReview', status.status, adminId, { note, filesReviewed: decl.files?.map((f) => f.id) ?? [] });
        return updatedDecl;
    }
    async updateDeclarationStep(declarationId, adminId, stepId, newStatus, meta) {
        const validStepIds = ['documentsReview', 'taxPreparation', 'submission'];
        if (!validStepIds.includes(stepId)) {
            throw new common_1.BadRequestException(`Invalid or unauthorized step to update: ${stepId}`);
        }
        const updatedDecl = await this.ordersService.updateStep(declarationId, stepId, newStatus, adminId, meta);
        return updatedDecl;
    }
    async assignDeclarations(declarationIds, adminId, assignedById, note) {
        const adminUser = await this.usersService.findOneById(adminId);
        if (!adminUser)
            throw new common_1.NotFoundException('Target admin user not found.');
        const isStaff = adminUser.roles?.includes(user_entity_1.UserRole.ADMIN) ||
            adminUser.roles?.includes(user_entity_1.UserRole.SUPER_ADMIN);
        if (!isStaff) {
            throw new common_1.ForbiddenException('Target user is not an admin or super admin.');
        }
        const updated = await this.ordersService.assignDeclarationsToAdmin(declarationIds, adminId, assignedById, note);
        return updated;
    }
    async getStepCounters() {
        return this.ordersService.getCountsByCurrentStep();
    }
    async listDeclarations(query) {
        const page = query.page ?? 1;
        const perPage = Math.min(query.perPage ?? 20, 100);
        const qb = this.taxDeclarationRepository.createQueryBuilder('d');
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tax_declaration_entity_1.TaxDeclaration)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        order_service_1.OrdersService,
        users_service_1.UsersService])
], AdminService);
//# sourceMappingURL=admin.service.js.map