import { EconomicSignals } from '../interfaces/intelligence.interfaces';

export interface RawSignalData {
  transactions: {
    total: number;
    successful: number;
    credits: number;
    debits: number;
    amounts: number[];
    channels: string[];
    dates: Date[];
  };
  contributions: {
    total: number;
    amounts: number[];
    dates: Date[];
  };
  groups: {
    memberCount: number;
    joinDates: Date[];
  };
}

export interface SignalExtractionResult {
  userId: string;
  signals: EconomicSignals;
  extractedAt: Date;
  dataPoints: number;
}
