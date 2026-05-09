import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class SquadService {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(SquadService.name);

  constructor(private readonly config: ConfigService) {
    const baseURL =
      config.get('squad.env') === 'production'
        ? 'https://api-d.squadco.com'
        : 'https://sandbox-api-d.squadco.com';

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.get('squad.secretKey')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initializePayment(payload: {
    email: string;
    amount: number; 
    initiateType: string;
    currency: string;
    transactionRef: string;
    callbackUrl?: string;
  }) {
    const { data } = await this.client.post('/transaction/initiate', {
      email: payload.email,
      amount: payload.amount,
      initiate_type: payload.initiateType,
      currency: payload.currency,
      transaction_ref: payload.transactionRef,
      callback_url: payload.callbackUrl,
    });
    return data;
  }

  async verifyTransaction(transactionRef: string) {
    const { data } = await this.client.get(`/transaction/verify/${transactionRef}`);
    return data;
  }
}
