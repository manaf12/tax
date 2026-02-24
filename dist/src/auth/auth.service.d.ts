import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
export declare class RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    streetAddress: string;
    postalCode: string;
    city: string;
}
export declare class AuthService {
    private rtRepo;
    private prtRepo;
    private usersRepo;
    private jwtService;
    private emailService;
    constructor(rtRepo: Repository<RefreshToken>, prtRepo: Repository<PasswordResetToken>, usersRepo: UsersService, jwtService: JwtService, emailService: EmailService);
    register(registerDto: RegisterDto): Promise<{
        id: string;
        email: string;
    }>;
    validateUser(email: string, password: string): Promise<User | null>;
    issueAccessToken(user: User): Promise<string>;
    createRefreshToken(user: User, ip?: string, userAgent?: string): Promise<string>;
    rotateRefreshToken(compositeToken: string, ip?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    revokeRefreshToken(compositeToken: string): Promise<boolean>;
    revokeAllForUser(userId: string): Promise<void>;
    createPasswordReset(email: string, ip?: string, userAgent?: string): Promise<void>;
    consumePasswordReset(compositeToken: string, newPassword: string): Promise<void>;
    consumeEmailVerification(compositeToken: string): Promise<boolean>;
}
