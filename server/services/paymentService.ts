import crypto from 'crypto';

interface BlankBankPaymentRequest {
  amount: number;
  orderId: string;
  description: string;
  returnUrl: string;
  failUrl?: string;
  customerEmail?: string;
  customerPhone?: string;
}

interface BlankBankPaymentResponse {
  paymentId: string;
  paymentUrl: string;
  status: string;
}

interface BlankBankStatusResponse {
  paymentId: string;
  orderId: string;
  status: 'NEW' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
  createdAt: string;
  paidAt?: string;
}

export class BlankBankPaymentService {
  private baseUrl: string;
  private merchantId: string;
  private secretKey: string;

  constructor() {
    this.baseUrl = process.env.BLANK_BANK_API_URL || 'https://api.blank.org';
    this.merchantId = process.env.BLANK_BANK_MERCHANT_ID || '';
    this.secretKey = process.env.BLANK_BANK_SECRET_KEY || '';

    if (!this.merchantId || !this.secretKey) {
      console.warn('Blank Bank credentials not configured. Payment functionality will be limited.');
    }
  }

  private generateSignature(params: Record<string, any>): string {
    // Сортируем параметры по ключу и создаем строку для подписи
    const sortedKeys = Object.keys(params).sort();
    const signatureString = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&') + this.secretKey;
    
    return crypto.createHash('sha256').update(signatureString).digest('hex');
  }

  async createPayment(request: BlankBankPaymentRequest): Promise<BlankBankPaymentResponse> {
    if (!this.merchantId || !this.secretKey) {
      throw new Error('Blank Bank credentials not configured');
    }

    const params = {
      merchant_id: this.merchantId,
      amount: Math.round(request.amount * 100), // Конвертируем в копейки
      order_id: request.orderId,
      description: request.description,
      return_url: request.returnUrl,
      fail_url: request.failUrl || request.returnUrl,
      customer_email: request.customerEmail || '',
      customer_phone: request.customerPhone || '',
      currency: 'RUB',
      timestamp: Date.now().toString()
    };

    const signature = this.generateSignature(params);

    try {
      const response = await fetch(`${this.baseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`
        },
        body: JSON.stringify({
          ...params,
          signature
        })
      });

      if (!response.ok) {
        throw new Error(`Blank Bank API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        paymentId: data.payment_id,
        paymentUrl: data.payment_url,
        status: data.status
      };
    } catch (error) {
      console.error('Error creating Blank Bank payment:', error);
      throw new Error('Failed to create payment');
    }
  }

  async getPaymentStatus(paymentId: string): Promise<BlankBankStatusResponse> {
    if (!this.merchantId || !this.secretKey) {
      throw new Error('Blank Bank credentials not configured');
    }

    const params = {
      merchant_id: this.merchantId,
      payment_id: paymentId,
      timestamp: Date.now().toString()
    };

    const signature = this.generateSignature(params);

    try {
      const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'X-Signature': signature
        }
      });

      if (!response.ok) {
        throw new Error(`Blank Bank API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        paymentId: data.payment_id,
        orderId: data.order_id,
        status: data.status,
        amount: data.amount / 100, // Конвертируем из копеек
        currency: data.currency,
        createdAt: data.created_at,
        paidAt: data.paid_at
      };
    } catch (error) {
      console.error('Error getting Blank Bank payment status:', error);
      throw new Error('Failed to get payment status');
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<{ refundId: string; status: string }> {
    if (!this.merchantId || !this.secretKey) {
      throw new Error('Blank Bank credentials not configured');
    }

    const params = {
      merchant_id: this.merchantId,
      payment_id: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      timestamp: Date.now().toString()
    };

    const signature = this.generateSignature(params);

    try {
      const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`
        },
        body: JSON.stringify({
          ...params,
          signature
        })
      });

      if (!response.ok) {
        throw new Error(`Blank Bank API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        refundId: data.refund_id,
        status: data.status
      };
    } catch (error) {
      console.error('Error refunding Blank Bank payment:', error);
      throw new Error('Failed to refund payment');
    }
  }

  verifyCallback(callbackData: Record<string, any>): boolean {
    if (!this.secretKey) {
      return false;
    }

    const receivedSignature = callbackData.signature;
    delete callbackData.signature;

    const expectedSignature = this.generateSignature(callbackData);
    
    return receivedSignature === expectedSignature;
  }
}

export const blankBankPaymentService = new BlankBankPaymentService();