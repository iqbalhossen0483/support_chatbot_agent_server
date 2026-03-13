import { Website } from '../entities/website.entity.js';

declare module 'express' {
  interface Request {
    website?: Website;
    user?: { id: number; email: string; role: string };
  }
}
