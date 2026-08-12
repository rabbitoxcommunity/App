import { delay } from './client';

export type Customer = {
  id: string;
  name: string;
  phone: string;
  /** Only shop-approved customers see "Pay Later (Credit)" at checkout. */
  creditApproved: boolean;
};

export type AuthSession = {
  token: string;
  customer: Customer;
};

/** Any code works in the mock except an obviously wrong one, so QA can move fast. */
export const MOCK_OTP = '4747';

export class OtpError extends Error {}

/**
 * Mock auth. Replace each method body with a `request(...)` call once
 * `POST /auth/otp` and `POST /auth/verify` exist on the backend.
 */
export const auth = {
  async requestOtp(phone: string, _channel: 'sms' | 'whatsapp'): Promise<string> {
    await delay(700);
    return `challenge_${phone.replace(/\D/g, '')}_${Date.now()}`;
  },

  async verifyOtp(challengeId: string, code: string): Promise<AuthSession> {
    await delay(700);
    if (code !== MOCK_OTP) throw new OtpError('invalid-otp');

    // `requestOtp` encodes the full E.164 digits into the challenge id.
    const digits = challengeId.split('_')[1] ?? '';
    return {
      token: `mock_token_${Date.now()}`,
      customer: {
        id: 'cust_1',
        name: 'Aisha',
        phone: digits ? `+${digits}` : '',
        creditApproved: true,
      },
    };
  },

  async signInWithProvider(provider: 'google' | 'apple'): Promise<AuthSession> {
    await delay(700);
    return {
      token: `mock_token_${provider}_${Date.now()}`,
      customer: {
        id: 'cust_1',
        name: 'Aisha',
        phone: '+971502148873',
        creditApproved: true,
      },
    };
  },
};
