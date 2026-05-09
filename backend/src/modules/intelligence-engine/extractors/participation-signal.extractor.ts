import { Injectable } from '@nestjs/common';
import { GroupMember, Contribution } from '@prisma/client';

export interface ParticipationSignals {
  groupParticipation: number; // 0–100
}

// Benchmark: member of 3+ groups with contributions = full score
const GROUP_BENCHMARK = 3;

@Injectable()
export class ParticipationSignalExtractor {
  extract(memberships: GroupMember[], contributions: Contribution[]): ParticipationSignals {
    if (memberships.length === 0) {
      return { groupParticipation: 0 };
    }

    const activeGroupIds = new Set(contributions.map((c) => c.groupId));
    const activeRatio = activeGroupIds.size / memberships.length;

    // Score = membership breadth × active participation ratio
    const breadthScore = Math.min(100, Math.round((memberships.length / GROUP_BENCHMARK) * 100));
    const groupParticipation = Math.round(breadthScore * activeRatio);

    return { groupParticipation };
  }
}
