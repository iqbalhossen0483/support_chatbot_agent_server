import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const ApiKeyWebsite = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.website;
  },
);
