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
exports.AuthService = exports.RegisterDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const refresh_token_entity_1 = require("./refresh-token.entity");
const password_reset_token_entity_1 = require("./password-reset-token.entity");
const users_service_1 = require("../users/users.service");
const email_service_1 = require("../email/email.service");
const token_utils_1 = require("./token.utils");
class RegisterDto {
    email;
    password;
    firstName;
    lastName;
    streetAddress;
    postalCode;
    city;
}
exports.RegisterDto = RegisterDto;
let AuthService = class AuthService {
    rtRepo;
    prtRepo;
    usersRepo;
    jwtService;
    emailService;
    constructor(rtRepo, prtRepo, usersRepo, jwtService, emailService) {
        this.rtRepo = rtRepo;
        this.prtRepo = prtRepo;
        this.usersRepo = usersRepo;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async register(registerDto) {
        const { email, password, firstName, lastName, streetAddress, postalCode, city, } = registerDto;
        const exists = await this.usersRepo.findOneByEmail(email);
        if (exists) {
            throw new common_1.BadRequestException('Email already used');
        }
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await this.usersRepo.createUser(email, passwordHash, {
            firstName,
            lastName,
            streetAddress,
            postalCode,
            city,
        });
        void this.emailService
            .sendWelcomeEmail({
            email: user.email,
            firstName,
        })
            .catch((e) => console.log(e));
        return { id: user.id, email: user.email };
    }
    async validateUser(email, password) {
        const user = await this.usersRepo.findOneByEmail(email);
        if (!user)
            return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok)
            return null;
        return user;
    }
    async issueAccessToken(user) {
        const payload = { sub: user.id, roles: user.roles };
        return this.jwtService.signAsync(payload, {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
        });
    }
    async createRefreshToken(user, ip, userAgent) {
        const raw = (0, token_utils_1.generateRandomHex)(64);
        const tokenHash = await bcrypt.hash(raw, 12);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        const rt = this.rtRepo.create({
            user,
            tokenHash,
            expiresAt,
            ip,
            userAgent,
        });
        const saved = await this.rtRepo.save(rt);
        return (0, token_utils_1.composeToken)(saved.id, raw);
    }
    async rotateRefreshToken(compositeToken, ip, userAgent) {
        const parsed = (0, token_utils_1.parseCompositeToken)(compositeToken);
        if (!parsed)
            throw new common_1.UnauthorizedException('Invalid token format');
        const row = await this.rtRepo.findOne({
            where: { id: parsed.id },
            relations: ['user'],
        });
        if (!row || row.revoked || row.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const ok = await bcrypt.compare(parsed.raw, row.tokenHash);
        if (!ok) {
            row.revoked = true;
            await this.rtRepo.save(row);
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        row.revoked = true;
        await this.rtRepo.save(row);
        const newRefresh = await this.createRefreshToken(row.user, ip, userAgent);
        const newAccess = await this.issueAccessToken(row.user);
        return { accessToken: newAccess, refreshToken: newRefresh };
    }
    async revokeRefreshToken(compositeToken) {
        const parsed = (0, token_utils_1.parseCompositeToken)(compositeToken);
        if (!parsed)
            return false;
        const row = await this.rtRepo.findOne({ where: { id: parsed.id } });
        if (!row)
            return false;
        row.revoked = true;
        await this.rtRepo.save(row);
        return true;
    }
    async revokeAllForUser(userId) {
        await this.rtRepo.update({ user: { id: userId } }, { revoked: true });
    }
    async createPasswordReset(email, ip, userAgent) {
        const user = await this.usersRepo.findOneByEmail(email);
        if (!user)
            return;
        const rawToken = (0, token_utils_1.generateRandomHex)(32);
        const tokenHash = await bcrypt.hash(rawToken, 12);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
        const pr = this.prtRepo.create({
            user,
            tokenHash,
            expiresAt,
            ip,
            userAgent,
        });
        const saved = await this.prtRepo.save(pr);
        const composite = (0, token_utils_1.composeToken)(saved.id, rawToken);
        const firstName = user.profile?.firstName ?? undefined;
        void this.emailService
            .sendPasswordResetEmail({
            email: user.email,
            firstName,
            tokenComposite: composite,
        })
            .catch((e) => console.log(e));
    }
    async consumePasswordReset(compositeToken, newPassword) {
        const [id, raw] = compositeToken.split('.');
        if (!id || !raw) {
            throw new common_1.BadRequestException('Invalid or expired token');
        }
        const pr = await this.prtRepo.findOne({
            where: { id },
            relations: ['user'],
        });
        if (!pr) {
            throw new common_1.BadRequestException('Invalid or expired token');
        }
        if (pr.expiresAt < new Date()) {
            await this.prtRepo.delete(pr.id);
            throw new common_1.BadRequestException('Invalid or expired token');
        }
        const match = await bcrypt.compare(raw, pr.tokenHash);
        if (!match) {
            throw new common_1.BadRequestException('Invalid or expired token');
        }
        const newHash = await bcrypt.hash(newPassword, 12);
        await this.usersRepo.updatePassword(pr.user.id, newHash);
        await this.prtRepo.delete(pr.id);
    }
    async consumeEmailVerification(compositeToken) {
        const parsed = (0, token_utils_1.parseCompositeToken)(compositeToken);
        if (!parsed)
            throw new common_1.BadRequestException('Invalid token format');
        const prt = await this.prtRepo.findOne({
            where: { id: parsed.id },
            relations: ['user'],
        });
        if (!prt || prt.used || prt.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Invalid/expired token');
        }
        const ok = await bcrypt.compare(parsed.raw, prt.tokenHash);
        if (!ok)
            throw new common_1.BadRequestException('Invalid token');
        prt.used = true;
        await this.prtRepo.save(prt);
        prt.user.isEmailVerified = true;
        await this.usersRepo.saveUser(prt.user);
        return true;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(refresh_token_entity_1.RefreshToken)),
    __param(1, (0, typeorm_1.InjectRepository)(password_reset_token_entity_1.PasswordResetToken)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map