import { User, SystemRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User & {
        systemRole?: SystemRole | null;
      };
      organizationId?: string;
      userId?: string;
    }
  }
}

export {};
