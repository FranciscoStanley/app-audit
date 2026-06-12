import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserView } from '../../../application/use-cases/auth.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserView | undefined => {
    return ctx.switchToHttp().getRequest<{ user?: AuthUserView }>().user;
  },
);
