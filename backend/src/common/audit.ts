import type { User } from '@prisma/client';
import { prisma } from '../database/prisma.js';

/**
 * Best-effort audit logging: records an administrative action without ever
 * breaking the request that triggered it.
 */
export async function audit(
  actor: Pick<User, 'id'>,
  action: string,
  target: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { actorId: actor.id, action, target, metadata: metadata as object } });
  } catch (error) {
    console.error('[audit] failed to record:', action, error instanceof Error ? error.message : error);
  }
}
