import { isIP } from 'net'
import { ExecutionContext, Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>
  ip?: string
  socket?: { remoteAddress?: string }
}

/** Cloudflare가 붙여 주는 실제 방문자 IP. 터널을 거친 요청에만 있고 클라이언트가 위조할 수 없다. */
export function cloudflareClientIp(req: RequestLike): string | null {
  const raw = req.headers?.['cf-connecting-ip']
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim()
  return value && isIP(value) ? value : null
}

/** loopback 또는 사설 대역(docker 네트워크 포함)에서 직접 들어온 연결인지. */
export function isPrivatePeer(address: string | undefined): boolean {
  if (!address) return false
  const ip = address.startsWith('::ffff:') ? address.slice(7) : address
  if (ip === '::1' || ip.startsWith('127.')) return true
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true
  const second = /^172\.(\d+)\./.exec(ip)
  if (second) return Number(second[1]) >= 16 && Number(second[1]) <= 31
  return /^f[cd]/i.test(ip) // IPv6 unique local
}

/**
 * 요청 한도를 실제 방문자 단위로 센다.
 *
 * 모든 외부 요청은 Cloudflare Tunnel을 거쳐 같은 컨테이너 IP로 들어오고, 웹 서버의 SSR 호출도
 * 웹 컨테이너 IP 하나로 들어온다. 기본 가드는 소켓 IP로 세기 때문에 전체 방문자가 한도 하나를
 * 나눠 쓰게 되고, 크롤러가 상세 페이지 몇십 개만 읽어도 429가 나 페이지가 500이 됐다.
 *
 * - 방문자 요청: CF-Connecting-IP 기준으로 센다(웹의 /api 프록시도 이 헤더를 그대로 넘긴다).
 * - 내부 호출(헤더 없음 + 사설 대역에서 직접 연결): 웹 서버의 SSR·미들웨어 호출이므로 세지 않는다.
 * - 그 외(헤더 없이 공인 IP에서 직접 연결): 기존처럼 소켓 IP로 센다.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (await super.shouldSkip(context)) return true
    const req = context.switchToHttp().getRequest<RequestLike>()
    return !cloudflareClientIp(req) && isPrivatePeer(req.socket?.remoteAddress)
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    return cloudflareClientIp(req) ?? req.ip ?? req.socket?.remoteAddress ?? 'unknown'
  }
}
