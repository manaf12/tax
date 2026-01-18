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
exports.AuthController = void 0;
const users_service_1 = require("../users/users.service");
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
let AuthController = class AuthController {
    authService;
    jwtService;
    usersService;
    constructor(authService, jwtService, usersService) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.usersService = usersService;
    }
    async register(dto) {
        return this.authService.register(dto);
    }
    async login(dto, req, res) {
        const user = await this.authService.validateUser(dto.email, dto.password);
        if (!user)
            throw { status: 401, message: 'Invalid credentials' };
        const accessToken = await this.authService.issueAccessToken(user);
        const refreshToken = await this.authService.createRefreshToken(user, req.ip, req.headers['user-agent']);
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === 'true',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 30,
        };
        res.cookie('refresh_token', refreshToken, cookieOptions);
        return { accessToken };
    }
    async refresh(req, res) {
        const raw = req.cookies['refresh_token'];
        if (!raw)
            throw { status: 401, message: 'No refresh token' };
        const { accessToken, refreshToken } = await this.authService.rotateRefreshToken(raw, req.ip, req.headers['user-agent']);
        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.COOKIE_SECURE === 'true',
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 30,
        });
        return { accessToken };
    }
    async logout(req, res) {
        const raw = req.cookies['refresh_token'];
        if (raw) {
            await this.authService.revokeRefreshToken(raw);
            res.clearCookie('refresh_token');
        }
        return { ok: true };
    }
    async forgot(dto, req) {
        await this.authService.createPasswordReset(dto.email, req.ip, req.headers['user-agent']);
        return { ok: true };
    }
    async reset(dto) {
        await this.authService.consumePasswordReset(dto.token, dto.newPassword);
        return { ok: true };
    }
    async verifyEmail(token) {
        await this.authService.consumeEmailVerification(token);
        return { ok: true };
    }
    async getMe(req) {
        if (!req.user || !req.user.sub) {
            console.error('User or user.sub is missing from request!');
            throw new common_1.UnauthorizedException('Invalid token payload');
        }
        const userId = req.user.sub;
        try {
            const user = await this.usersService.findOneById(userId);
            if (!user) {
                throw new common_1.UnauthorizedException('User not found in DB');
            }
            const userResponse = {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.profile?.firstName,
                    lastName: user.profile?.lastName,
                    emailVerified: user.isEmailVerified,
                    streetAddress: user.profile?.streetAddress,
                    postalCode: user.profile?.postalCode,
                    city: user.profile?.city,
                    roles: user.roles,
                },
            };
            return userResponse;
        }
        catch (error) {
            console.error('!!! ERROR inside getMe try-catch block !!!', error);
            throw error;
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgot", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "reset", null);
__decorate([
    (0, common_1.Get)('verify-email'),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        jwt_1.JwtService,
        users_service_1.UsersService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map