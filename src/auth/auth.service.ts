/* eslint-disable @typescript-eslint/no-unused-vars */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import {
  generateRandomHex,
  composeToken,
  parseCompositeToken,
} from './token.utils';

export class RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  streetAddress: string;
  postalCode: string;
  city: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken) private rtRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private prtRepo: Repository<PasswordResetToken>,
    private usersRepo: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // -----------------------
  // Registration & login
  // -----------------------
  async register(registerDto: RegisterDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      streetAddress,
      postalCode,
      city,
    } = registerDto;

    // 1️⃣ Check if email already exists
    const exists = await this.usersRepo.findOneByEmail(email);
    if (exists) {
      throw new BadRequestException('Email already used');
    }

    // 2️⃣ Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // 3️⃣ Create user
    const user = await this.usersRepo.createUser(email, passwordHash, {
      firstName,
      lastName,
      streetAddress,
      postalCode,
      city,
    });

    // 4️⃣ Send welcome email (non-blocking)
    void this.emailService
      .sendWelcomeEmail({
        email: user.email,
        firstName,
      })
      .catch((e) => console.log(e));

    // 5️⃣ Return success response
    return { id: user.id, email: user.email };
  }
  async validateUser(email: string, password: string) {
    const user = await this.usersRepo.findOneByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return user;
  }

  // -----------------------
  // JWT access token issuance
  // -----------------------
  async issueAccessToken(user: User) {
    const payload = { sub: user.id, roles: user.roles };

    return this.jwtService.signAsync(
      payload as any,
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
      } as any,
    );
  }
  // -----------------------
  // Refresh token creation (id.raw pattern)
  // -----------------------
  async createRefreshToken(user: User, ip?: string, userAgent?: string) {
    const raw = generateRandomHex(64);
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
    // Return composite token to client
    return composeToken(saved.id, raw);
  }

  // -----------------------
  // Rotate refresh token
  // -----------------------
  async rotateRefreshToken(
    compositeToken: string,
    ip?: string,
    userAgent?: string,
  ) {
    const parsed = parseCompositeToken(compositeToken);
    if (!parsed) throw new UnauthorizedException('Invalid token format');

    const row = await this.rtRepo.findOne({
      where: { id: parsed.id },
      relations: ['user'],
    });
    if (!row || row.revoked || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const ok = await bcrypt.compare(parsed.raw, row.tokenHash);
    if (!ok) {
      row.revoked = true;
      await this.rtRepo.save(row);
      throw new UnauthorizedException('Invalid refresh token');
    }

    row.revoked = true;
    await this.rtRepo.save(row);

    // create new refresh token and access token
    const newRefresh = await this.createRefreshToken(row.user, ip, userAgent);
    const newAccess = await this.issueAccessToken(row.user);
    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  // -----------------------
  // Logout / revoke single token
  // -----------------------
  async revokeRefreshToken(compositeToken: string) {
    const parsed = parseCompositeToken(compositeToken);
    if (!parsed) return false;
    const row = await this.rtRepo.findOne({ where: { id: parsed.id } });
    if (!row) return false;
    row.revoked = true;
    await this.rtRepo.save(row);
    return true;
  }

  // Revoke all refresh tokens for a user (used after password reset)
  async revokeAllForUser(userId: string) {
    await this.rtRepo.update(
      { user: { id: userId } as any },
      { revoked: true },
    );
  }

  // -----------------------
  // Password reset flow
  // -----------------------
  async createPasswordReset(email: string, ip?: string, userAgent?: string) {
    const user = await this.usersRepo.findOneByEmail(email);
    if (!user) {
      return true;
    }
    // const raw = generateRandomHex(48);
    // const tokenHash = await bcrypt.hash(raw, 12);
    // const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // const prt = this.prtRepo.create({
    //   user,
    //   tokenHash,
    //   expiresAt,
    //   ip,
    //   userAgent,
    // });
    // const saved = await this.prtRepo.save(prt);

    // const composite = composeToken(saved.id, raw);
    // await this.emailService.sendPasswordReset(user.email, composite);
    return true;
  }

  async consumePasswordReset(compositeToken: string, newPassword: string) {
    const parsed = parseCompositeToken(compositeToken);
    if (!parsed) throw new BadRequestException('Invalid token format');

    const prt = await this.prtRepo.findOne({
      where: { id: parsed.id },
      relations: ['user'],
    });
    if (!prt || prt.used || prt.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const ok = await bcrypt.compare(parsed.raw, prt.tokenHash);
    if (!ok) throw new BadRequestException('Invalid token');

    // mark used
    prt.used = true;
    await this.prtRepo.save(prt);

    // update password
    const hashed = await bcrypt.hash(newPassword, 12);
    prt.user.passwordHash = hashed;
    await this.usersRepo.saveUser(prt.user);

    // revoke all refresh tokens
    await this.revokeAllForUser(prt.user.id);

    // mark other reset tokens used
    await this.prtRepo.update(
      { user: { id: prt.user.id } as any, used: false },
      { used: true },
    );

    return true;
  }

  // -----------------------
  // Email verification consume (reuse PRT table for verification tokens)
  // -----------------------
  async consumeEmailVerification(compositeToken: string) {
    const parsed = parseCompositeToken(compositeToken);
    if (!parsed) throw new BadRequestException('Invalid token format');

    const prt = await this.prtRepo.findOne({
      where: { id: parsed.id },
      relations: ['user'],
    });
    if (!prt || prt.used || prt.expiresAt < new Date()) {
      throw new BadRequestException('Invalid/expired token');
    }

    const ok = await bcrypt.compare(parsed.raw, prt.tokenHash);
    if (!ok) throw new BadRequestException('Invalid token');

    prt.used = true;
    await this.prtRepo.save(prt);

    prt.user.isEmailVerified = true;
    await this.usersRepo.saveUser(prt.user);

    return true;
  }
}
