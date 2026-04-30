import { Injectable } from '@nestjs/common'
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport'

/** 인증 필수 — 401 자동 */
@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {}

/** 인증 선택 — 미인증도 null로 통과 */
@Injectable()
export class OptionalAuthGuard extends PassportAuthGuard('jwt') {
  handleRequest(_err: any, user: any): any {
    return user ?? null
  }
}
