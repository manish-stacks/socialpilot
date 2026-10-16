import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from './permissions';
export interface AuthUser { id: string; email: string; systemRole: 'USER' | 'ADMIN' }
export const CurrentUser = createParamDecorator((_d, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);
export const Public = () => SetMetadata('isPublic', true);
export const MinRole = (role: Role) => SetMetadata('minRole', role);
export const Membership = createParamDecorator((_d, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().membership);
