import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

export function getUserIdFromRequest(req: Request, jwtService: JwtService): number {
  try {
    const auth = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return 0;
    const token = auth.slice(7);
    const payload = jwtService.decode(token) as any;
    return payload?.sub ?? 0;
  } catch {
    return 0;
  }
}
