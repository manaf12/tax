import { Injectable, NotFoundException } from '@nestjs/common';
import { User, UserRole } from './user.entity';
import { ClientProfile } from './client-profile.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

interface ProfileData {
  firstName: string;
  lastName: string;
  streetAddress: string;
  postalCode: string;
  city: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ClientProfile)
    private clientProfileRepository: Repository<ClientProfile>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
  async findOneById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findOneWithProfile(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
  }

  async createUser(
    email: string,
    passwordHash: string,
    profileData: ProfileData,
  ): Promise<User> {
    const user = this.usersRepository.create({
      email,
      passwordHash,
      roles: [UserRole.USER],
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
  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    user.passwordHash = passwordHash;

    return this.usersRepository.save(user);
  }
  async markEmailAsVerified(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    user.isEmailVerified = true;
    return this.usersRepository.save(user);
  }
  async saveUser(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }
}
