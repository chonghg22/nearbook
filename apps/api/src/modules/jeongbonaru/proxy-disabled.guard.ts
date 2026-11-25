import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common'

/** Retired public test proxy. Read-only status never dispatches to the provider. */
@Injectable()
export class ProxyDisabledGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (context.getHandler().name === 'status') return true
    throw new NotFoundException()
  }
}
