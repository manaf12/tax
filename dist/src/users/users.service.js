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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const user_entity_1 = require("./user.entity");
const client_profile_entity_1 = require("./client-profile.entity");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
let UsersService = class UsersService {
    usersRepository;
    clientProfileRepository;
    constructor(usersRepository, clientProfileRepository) {
        this.usersRepository = usersRepository;
        this.clientProfileRepository = clientProfileRepository;
    }
    async findOneByEmail(email) {
        return this.usersRepository.findOne({ where: { email } });
    }
    async findOneById(id) {
        return this.usersRepository.findOne({ where: { id } });
    }
    async findByRole(role) {
        return this.usersRepository.find({
            where: { roles: (0, typeorm_1.ArrayContains)([role]) },
        });
    }
    async findOneWithProfile(id) {
        return this.usersRepository.findOne({
            where: { id },
            relations: ['profile'],
        });
    }
    async findByIds(ids) {
        return this.usersRepository.find({
            where: { id: (0, typeorm_1.In)(ids) },
            relations: ['profile'],
        });
    }
    async createUser(email, passwordHash, profileData) {
        const user = this.usersRepository.create({
            email,
            passwordHash,
            roles: [user_entity_1.UserRole.USER],
        });
        const savedUser = await this.usersRepository.save(user);
        const profile = this.clientProfileRepository.create({
            ...profileData,
            user: savedUser,
            languagePreference: 'en',
        });
        await this.clientProfileRepository.save(profile);
        return savedUser;
    }
    async updatePassword(userId, passwordHash) {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        user.passwordHash = passwordHash;
        return this.usersRepository.save(user);
    }
    async markEmailAsVerified(userId) {
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        user.isEmailVerified = true;
        return this.usersRepository.save(user);
    }
    async saveUser(user) {
        return this.usersRepository.save(user);
    }
    async getOrCreateClientProfile(userId, data) {
        const existing = await this.clientProfileRepository.findOne({
            where: { user: { id: userId } },
            relations: ['user'],
        });
        if (existing)
            return existing;
        const user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const profile = this.clientProfileRepository.create({
            user,
            firstName: data?.firstName ?? '',
            lastName: data?.lastName ?? '',
            streetAddress: data?.streetAddress ?? '',
            postalCode: data?.postalCode ?? '',
            city: data?.city ?? '',
            languagePreference: 'en',
        });
        return this.clientProfileRepository.save(profile);
    }
    async listAdmins() {
        const users = await this.usersRepository
            .createQueryBuilder('u')
            .select(['u.id', 'u.email', 'u.roles'])
            .where(`u.roles LIKE :admin OR u.roles LIKE :super`, {
            admin: `%${user_entity_1.UserRole.ADMIN}%`,
            super: `%${user_entity_1.UserRole.SUPER_ADMIN}%`,
        })
            .orderBy('u.email', 'ASC')
            .getMany();
        return users.map((u) => ({ id: u.id, email: u.email, roles: u.roles }));
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_2.InjectRepository)(client_profile_entity_1.ClientProfile)),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        typeorm_1.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map