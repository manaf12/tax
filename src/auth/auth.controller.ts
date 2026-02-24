import { UsersService } from 'src/users/users.service';
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);

    if (!user) throw { status: 401, message: 'Invalid credentials' };

    const accessToken = await this.authService.issueAccessToken(user);
    const refreshToken = await this.authService.createRefreshToken(
      user,
      req.ip,
      req.headers['user-agent'] as string,
    );

    // set HttpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax' as const,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    };
    res.cookie('refresh_token', refreshToken, cookieOptions);

    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies['refresh_token'];
    if (!raw) throw { status: 401, message: 'No refresh token' };
    const { accessToken, refreshToken } =
      await this.authService.rotateRefreshToken(
        raw,
        req.ip,
        req.headers['user-agent'] as string,
      );

    // set rotated cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies['refresh_token'];
    if (raw) {
      await this.authService.revokeRefreshToken(raw);
      res.clearCookie('refresh_token');
    }
    return { ok: true };
  }

  @Post('forgot-password')
  async forgot(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const userAgentHeader = req.headers['user-agent'];
    const userAgent =
      typeof userAgentHeader === 'string' ? userAgentHeader : '';

    await this.authService.createPasswordReset(dto.email, req.ip, userAgent);

    // Always return same generic result to avoid enumeration
    return { ok: true };
  }

  @Post('reset-password')
  async reset(@Body() dto: ResetPasswordDto) {
    await this.authService.consumePasswordReset(dto.token, dto.newPassword);
    return { ok: true };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    await this.authService.consumeEmailVerification(token);
    return { ok: true };
  }
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req: Request) {
    if (!req.user || !req.user.sub) {
      console.error('User or user.sub is missing from request!');
      throw new UnauthorizedException('Invalid token payload');
    }

    const userId = req.user.sub;

    try {
      const user = await this.usersService.findOneById(userId);

      if (!user) {
        throw new UnauthorizedException('User not found in DB');
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
          roles: user.roles, // <-- This is the fix
        },
      };

      return userResponse;
    } catch (error) {
      console.error('!!! ERROR inside getMe try-catch block !!!', error);
      throw error;
    }
  }
}
