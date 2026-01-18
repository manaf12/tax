import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
export declare class AuthController {
    private authService;
    private jwtService;
    private usersService;
    constructor(authService: AuthService, jwtService: JwtService, usersService: UsersService);
    register(dto: RegisterDto): Promise<{
        id: string;
        email: string;
    }>;
    login(dto: LoginDto, req: Request, res: Response): Promise<{
        accessToken: string;
    }>;
    refresh(req: Request, res: Response): Promise<{
        accessToken: string;
    }>;
    logout(req: Request, res: Response): Promise<{
        ok: boolean;
    }>;
    forgot(dto: ForgotPasswordDto, req: Request): Promise<{
        ok: boolean;
    }>;
    reset(dto: ResetPasswordDto): Promise<{
        ok: boolean;
    }>;
    verifyEmail(token: string): Promise<{
        ok: boolean;
    }>;
    getMe(req: Request): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            emailVerified: boolean;
            streetAddress: string;
            postalCode: string;
            city: string;
            roles: import("../users/user.entity").UserRole[];
        };
    }>;
}
