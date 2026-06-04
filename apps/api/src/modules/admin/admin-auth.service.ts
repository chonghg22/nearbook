import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { adminUsers, db, desc, eq } from '@nearbook/db'
import { AdminLoginDto } from './dto/admin-login.dto'
import { AdminTotpTicketDto } from './dto/admin-totp-ticket.dto'
import { AdminTotpVerifyDto } from './dto/admin-totp-verify.dto'
import { decryptAdminSecret, encryptAdminSecret } from './admin-crypto.util'
import { hashAdminPassword, verifyAdminPassword } from './admin-password.util'
import { buildOtpAuthUri, generateBase32Secret, verifyTotpCode } from './admin-totp.util'

type AdminTicketPayload = {
  sub: number
  stage: 'setup_totp' | 'verify_totp'
  type: 'admin_ticket'
}

type AdminAccessPayload = {
  sub: number
  role: string
  type: 'admin_access'
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private getJwtSecret() {
    const secret = this.config.get<string>('ADMIN_JWT_SECRET')
    if (!secret) throw new Error('ADMIN_JWT_SECRET is not configured')
    return secret
  }

  private getEncryptionSecret() {
    const secret = this.config.get<string>('ADMIN_TOTP_ENCRYPTION_KEY')
    if (!secret) throw new Error('ADMIN_TOTP_ENCRYPTION_KEY is not configured')
    return secret
  }

  private async issueTicket(adminUserId: number, stage: AdminTicketPayload['stage']) {
    return this.jwtService.signAsync(
      { sub: adminUserId, stage, type: 'admin_ticket' satisfies AdminTicketPayload['type'] },
      { secret: this.getJwtSecret(), expiresIn: '10m' },
    )
  }

  private async issueAccessToken(adminUserId: number, role: string) {
    return this.jwtService.signAsync(
      { sub: adminUserId, role, type: 'admin_access' satisfies AdminAccessPayload['type'] },
      { secret: this.getJwtSecret(), expiresIn: '12h' },
    )
  }

  private async verifyTicket(ticket: string, expectedStage: AdminTicketPayload['stage']) {
    let payload: AdminTicketPayload
    try {
      payload = await this.jwtService.verifyAsync<AdminTicketPayload>(ticket, {
        secret: this.getJwtSecret(),
      })
    } catch {
      throw new UnauthorizedException('Invalid admin ticket')
    }

    if (payload.type !== 'admin_ticket' || payload.stage !== expectedStage) {
      throw new UnauthorizedException('Invalid admin ticket')
    }

    const [adminUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.sub))
      .limit(1)

    if (!adminUser) throw new UnauthorizedException('Admin user not found')
    if (adminUser.status !== 'active') throw new ForbiddenException('Admin user is not active')
    return adminUser
  }

  async verifyAccessToken(token: string) {
    let payload: AdminAccessPayload
    try {
      payload = await this.jwtService.verifyAsync<AdminAccessPayload>(token, {
        secret: this.getJwtSecret(),
      })
    } catch {
      throw new UnauthorizedException()
    }

    if (payload.type !== 'admin_access') {
      throw new UnauthorizedException()
    }

    const [adminUser] = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        role: adminUsers.role,
        status: adminUsers.status,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.sub))
      .limit(1)

    if (!adminUser || adminUser.status !== 'active') {
      throw new UnauthorizedException()
    }

    return adminUser
  }

  async login(dto: AdminLoginDto) {
    const email = dto.email.trim().toLowerCase()
    const [adminUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1)

    if (!adminUser) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (adminUser.lockedUntil && adminUser.lockedUntil > new Date()) {
      throw new ForbiddenException('Admin account is temporarily locked')
    }

    if (adminUser.status !== 'active') {
      throw new ForbiddenException('Admin account is not active')
    }

    const passwordMatches = await verifyAdminPassword(dto.password, adminUser.passwordHash)
    if (!passwordMatches) {
      const failedCount = adminUser.failedLoginCount + 1
      await db
        .update(adminUsers)
        .set({
          failedLoginCount: failedCount,
          lockedUntil: failedCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, adminUser.id))
      throw new UnauthorizedException('Invalid credentials')
    }

    await db
      .update(adminUsers)
      .set({
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, adminUser.id))

    const stage = adminUser.totpEnabled ? 'verify_totp' : 'setup_totp'
    const ticket = await this.issueTicket(adminUser.id, stage)

    return {
      data: {
        step: stage,
        ticket,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          totpEnabled: adminUser.totpEnabled,
        },
      },
    }
  }

  async startTotpSetup(dto: AdminTotpTicketDto) {
    const adminUser = await this.verifyTicket(dto.ticket, 'setup_totp')

    const secret = generateBase32Secret()
    const encrypted = encryptAdminSecret(secret, this.getEncryptionSecret())
    await db
      .update(adminUsers)
      .set({
        pendingTotpSecretEncrypted: encrypted,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, adminUser.id))

    return {
      data: {
        manualKey: secret,
        otpauthUri: buildOtpAuthUri(adminUser.email, secret),
      },
    }
  }

  async confirmTotpSetup(dto: AdminTotpVerifyDto) {
    const adminUser = await this.verifyTicket(dto.ticket, 'setup_totp')
    if (!adminUser.pendingTotpSecretEncrypted) {
      throw new BadRequestException('TOTP setup was not started')
    }

    const secret = decryptAdminSecret(adminUser.pendingTotpSecretEncrypted, this.getEncryptionSecret())
    const valid = verifyTotpCode(secret, dto.code)
    if (!valid) {
      throw new UnauthorizedException('Invalid TOTP code')
    }

    const encrypted = encryptAdminSecret(secret, this.getEncryptionSecret())
    await db
      .update(adminUsers)
      .set({
        totpEnabled: true,
        totpSecretEncrypted: encrypted,
        pendingTotpSecretEncrypted: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, adminUser.id))

    const accessToken = await this.issueAccessToken(adminUser.id, adminUser.role)
    return {
      data: {
        accessToken,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
    }
  }

  async verifyTotp(dto: AdminTotpVerifyDto) {
    const adminUser = await this.verifyTicket(dto.ticket, 'verify_totp')
    if (!adminUser.totpEnabled || !adminUser.totpSecretEncrypted) {
      throw new BadRequestException('TOTP is not configured')
    }

    const secret = decryptAdminSecret(adminUser.totpSecretEncrypted, this.getEncryptionSecret())
    const valid = verifyTotpCode(secret, dto.code)
    if (!valid) {
      throw new UnauthorizedException('Invalid TOTP code')
    }

    await db
      .update(adminUsers)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, adminUser.id))

    const accessToken = await this.issueAccessToken(adminUser.id, adminUser.role)
    return {
      data: {
        accessToken,
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
    }
  }

  async me(token: string) {
    const adminUser = await this.verifyAccessToken(token)
    return {
      data: adminUser,
    }
  }

  async upsertAdminUser(email: string, password: string, role = 'super_admin') {
    const normalizedEmail = email.trim().toLowerCase()
    const passwordHash = await hashAdminPassword(password)
    const [existing] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, normalizedEmail))
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(adminUsers)
        .set({
          passwordHash,
          role,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, existing.id))
        .returning({
          id: adminUsers.id,
          email: adminUsers.email,
          role: adminUsers.role,
        })
      return updated
    }

    const [created] = await db
      .insert(adminUsers)
      .values({
        email: normalizedEmail,
        passwordHash,
        role,
        status: 'active',
      })
      .returning({
        id: adminUsers.id,
        email: adminUsers.email,
        role: adminUsers.role,
      })

    return created
  }
}
