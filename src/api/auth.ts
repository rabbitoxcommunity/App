import { api, ApiError, setTokens } from './client';

export type Customer = {
  id: string;
  name: string;
  phone: string;
  language: 'en' | 'ar';
  /** Only shop-approved customers see "Pay Later (Credit)" at checkout. */
  creditApproved: boolean;
};

export type AuthSession = {
  customer: Customer;
};

export class OtpError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'OtpError';
  }
}

/** BACKEND-DESIGN §5.3 — customer auth is phone + OTP, never a password. */
export const auth = {
  async requestOtp(phone: string, channel: 'sms' | 'whatsapp'): Promise<string> {
    try {
      const { challengeId } = await api.post<{ challengeId: string; expiresIn: number }>(
        '/auth/otp',
        { phone, channel },
        { skipAuth: true },
      );
      return challengeId;
    } catch (err) {
      if (err instanceof ApiError) throw new OtpError(err.message, err.code);
      throw err;
    }
  },

  async verifyOtp(challengeId: string, code: string): Promise<AuthSession> {
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: Customer }>(
        '/auth/verify',
        { challengeId, code },
        { skipAuth: true },
      );
      await setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
      return { customer: res.user };
    } catch (err) {
      if (err instanceof ApiError) throw new OtpError(err.message, err.code);
      throw err;
    }
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken }, { skipAuth: true, retry: false }).catch(() => undefined);
  },
};
