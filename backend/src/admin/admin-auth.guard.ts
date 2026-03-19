import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ADMIN_ROLES_KEY, AdminRole } from './admin-roles.decorator';
import { ADMIN_PERMISSIONS_KEY, AdminPermission } from './admin-permissions.decorator';

export const ADMIN_PUBLIC_KEY = 'admin:public';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(ADMIN_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowedRoles = this.reflector.getAllAndOverride<AdminRole[]>(ADMIN_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const allowedPermissions = this.reflector.getAllAndOverride<AdminPermission[]>(ADMIN_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('管理员登录已过期，请重新登录');
    }

    const token = authorization.slice(7);
    let payload: any;

    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'default_secret',
      });
    } catch {
      throw new UnauthorizedException('管理员登录已失效，请重新登录');
    }

    if (!payload?.role) {
      throw new UnauthorizedException('无效的管理员身份');
    }

    if (allowedRoles?.length && !allowedRoles.includes(payload.role)) {
      throw new UnauthorizedException('当前管理员权限不足');
    }

    const permissions = Array.isArray(payload?.permissions) ? payload.permissions : [];
    if (
      allowedPermissions?.length &&
      payload.role !== 'super_admin' &&
      !allowedPermissions.every((permission) => permissions.includes(permission))
    ) {
      throw new UnauthorizedException('当前管理员缺少所需权限');
    }

    request.admin = payload;
    return true;
  }
}
