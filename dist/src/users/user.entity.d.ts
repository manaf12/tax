import { RefreshToken } from '../auth/refresh-token.entity';
import { PasswordResetToken } from '../auth/password-reset-token.entity';
import { ClientProfile } from './client-profile.entity';
export declare enum UserRole {
    USER = "user",
    ADMIN = "admin",
    SUPER_ADMIN = "SUPER_ADMIN"
}
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    isEmailVerified: boolean;
    roles: UserRole[];
    createdAt: Date;
    updatedAt: Date;
    refreshTokens: RefreshToken[];
    passwordResetTokens: PasswordResetToken[];
    profile: ClientProfile;
}
