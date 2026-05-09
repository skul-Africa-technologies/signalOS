import { Injectable } from '@nestjs/common';
import { EconomicSignals, IntelligenceScores, RepaymentConfidence } from '../interfaces/intelligence.interfaces';

@Injectable()
export class RepaymentConfidenceEvaluator {
  evaluate(signals: EconomicSignals, scores: IntelligenceScores): RepaymentConfidence {
    const factors: string[] = [];
    let score = 0;

    // Repayment history (40 pts)
    if (signals.repaymentConsistency >= 70) { score += 40; factors.push('Strong repayment history'); }
    else if (signals.repaymentConsistency >= 45) { score += 22; factors.push('Moderate repayment history'); }
    else { factors.push('Weak repayment history'); }

    // Income stability (30 pts)
    if (signals.incomeStability >= 65) { score += 30; factors.push('Stable income pattern'); }
    else if (signals.incomeStability >= 35) { score += 16; factors.push('Moderate income regularity'); }
    else { factors.push('Irregular income pattern'); }

    // Savings discipline (20 pts)
    if (signals.savingsBehaviour >= 60) { score += 20; factors.push('Consistent savings behaviour'); }
    else if (signals.savingsBehaviour >= 30) { score += 10; factors.push('Some savings activity'); }
    else { factors.push('Limited savings behaviour'); }

    // Liquidity buffer (10 pts)
    if (scores.liquidityScore >= 60) { score += 10; factors.push('Adequate liquidity buffer'); }
    else if (scores.liquidityScore >= 30) { score += 5; }

    return {
      score,
      level: score >= 70 ? 'High' : score >= 45 ? 'Medium' : 'Low',
      factors,
    };
  }
}
