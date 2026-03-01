import { User, UserRole } from './user.entity';
import { ClientProfile } from './client-profile.entity';
import { Repository } from 'typeorm';
interface ProfileData {
    firstName: string;
    lastName: string;
    streetAddress: string;
    postalCode: string;
    city: string;
}
export declare class UsersService {
    private usersRepository;
    private clientProfileRepository;
    constructor(usersRepository: Repository<User>, clientProfileRepository: Repository<ClientProfile>);
    findOneByEmail(email: string): Promise<User | null>;
    findOneById(id: string): Promise<User | null>;
    findByRole(role: UserRole): Promise<User[]>;
    findOneWithProfile(id: string): Promise<User | null>;
    findByIds(ids: string[]): Promise<User[]>;
    createUser(email: string, passwordHash: string, profileData: ProfileData): Promise<User>;
    updatePassword(userId: string, passwordHash: string): Promise<User>;
    markEmailAsVerified(userId: string): Promise<User>;
    saveUser(user: User): Promise<User>;
    getOrCreateClientProfile(userId: string, data?: Partial<ClientProfile>): Promise<ClientProfile>;
    listAdmins(): Promise<Array<{
        id: string;
        email: string;
        roles: UserRole[];
    }>>;
}
export {};
