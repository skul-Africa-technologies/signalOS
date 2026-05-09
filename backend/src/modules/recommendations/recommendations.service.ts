import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoansService } from '../loans/loans.service';

export interface Recommendation {
  type: 'loan' | 'savings' | 'growth';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loans: LoansService,
  ) {}

  async getRecommendations(userId: string): Promise<Recommendation[]> {
    const [eligibility, savingsCount, txnCount] = await Promise.all([
      this.loans.getEligibility(userId),
      this.prisma.contribution.count({ where: { userId } }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    const recs: Recommendation[] = [];

    // Loan recommendations
    if (eligibility.eligible && 'eligibleAmount' in eligibility) {
      recs.push({
        type: 'loan',
        title: 'You qualify for a micro-loan',
        description: eligibility.recommendation as string,
        priority: eligibility.riskLevel === 'Low' ? 'high' : 'medium',
      });
    } else {
      recs.push({
        type: 'loan',
        title: 'Improve your loan eligibility',
        description: 'Complete at least 5 successful transactions to unlock loan access',
        priority: 'high',
      });
    }

    // Savings recommendations
    if (savingsCount === 0) {
      recs.push({
        type: 'savings',
        title: 'Join a savings group',
        description: 'Cooperative savings boost your trust score and unlock better loan terms',
        priority: 'high',
      });
    } else if (savingsCount < 5) {
      recs.push({
        type: 'savings',
        title: 'Increase savings contributions',
        description: `You have ${savingsCount} contribution(s). Reach 5 to significantly improve your score`,
        priority: 'medium',
      });
    } else {
      recs.push({
        type: 'savings',
        title: 'Strong savings behaviour',
        description: 'Your savings consistency is improving your financial profile',
        priority: 'low',
      });
    }

    // Growth tips
    if (txnCount < 10) {
      recs.push({
        type: 'growth',
        title: 'Build your transaction history',
        description: 'More transactions signal economic activity and raise your trust score',
        priority: 'medium',
      });
    } else {
      recs.push({
        type: 'growth',
        title: 'Maintain consistent activity',
        description: 'Regular transactions keep your score high and unlock larger loan amounts',
        priority: 'low',
      });
    }

    return recs;
  }

  async getSummary(userId: string) {
    const [eligibility, recommendations] = await Promise.all([
      this.loans.getEligibility(userId),
      this.getRecommendations(userId),
    ]);
    return { eligibility, recommendations };
  }
}
