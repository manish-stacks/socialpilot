import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SettingsService } from '../settings/settings.service';

/** Global, registered after JwtAuthGuard. Public routes (login, health, OAuth callback) are never blocked. */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private settings: SettingsService, private reflector: Reflector) {}
  async canActivate(ctx: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>('isPublic', [ctx.getHandler(), ctx.getClass()])) return true;
    const user = ctx.switchToHttp().getRequest().user;
    if (user?.systemRole === 'ADMIN') return true;
    if (await this.settings.get<boolean>('maintenance_mode')) throw new ServiceUnavailableException('The service is undergoing maintenance. Please try again soon.');
    return true;
  }
}
