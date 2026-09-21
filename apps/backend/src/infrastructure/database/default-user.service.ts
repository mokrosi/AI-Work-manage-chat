import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const DEFAULT_USER_EMAIL = 'demo@example.com';

/**
 * Resolves the "current" user for API calls that do not supply a userId.
 * In this single-user demo every request maps to the seeded demo user.
 */
@Injectable()
export class DefaultUserService {
  private cachedId?: string;

  constructor(private readonly prisma: PrismaService) {}

  async resolveId(userId?: string): Promise<string> {
    if (userId) {
      return userId;
    }

    if (!this.cachedId) {
      let user = await this.prisma.user.findUnique({
        where: { email: DEFAULT_USER_EMAIL },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: { email: DEFAULT_USER_EMAIL, name: 'Demo User', timezone: 'UTC' },
        });
      }

      this.cachedId = user.id;
    }

    return this.cachedId;
  }
}