import { User } from '../users/user.entity';
export declare class RefreshToken {
    id: string;
    user: User;
    tokenHash: string;
    expiresAt: Date;
    revoked: boolean;
    ip?: string;
    userAgent?: string;
    createdAt: Date;
}
