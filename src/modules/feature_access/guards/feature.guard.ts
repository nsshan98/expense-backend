import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureAccessService } from '../feature_access.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureAccessService: FeatureAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<string>('feature', context.getHandler());
    if (!feature) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const hasAccess = await this.featureAccessService.hasAccess(
      user.id,
      feature,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Upgrade your plan to access this feature');
    }
    return true;
  }
}
