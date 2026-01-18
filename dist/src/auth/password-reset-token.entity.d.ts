import { User } from '../users/user.entity';
export declare class PasswordResetToken {
    id: string;
    user: User;
    tokenHash: string;
    expiresAt: Date;
    used: boolean;
    ip?: string;
    userAgent?: string;
    createdAt: Date;
}
