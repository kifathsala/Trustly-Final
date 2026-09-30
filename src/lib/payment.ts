import { UserSubscription } from '../types';

export interface CheckoutOptions {
  planId: 'monthly' | 'yearly';
  userId: string;
  userEmail: string;
}

export interface CheckoutSessionResult {
  success: boolean;
  code: 'READY_FOR_PROVIDER' | 'PAYMENTS_NOT_CONFIGURED' | 'ERROR';
  sessionId?: string;
  checkoutUrl?: string;
  message: string;
}

export interface SubscriptionStatusResult {
  isPlus: boolean;
  subscription: UserSubscription | null;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
}

/**
 * TRUSTLY Payment Provider Abstraction Layer
 * Pre-configured for Razorpay (India: INR) & Stripe (Global: USD)
 * Does NOT execute fake successful payments.
 */
export class PaymentService {
  private static instance: PaymentService;

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Initializes a checkout session for TRUSTLY Plus
   */
  public async createCheckoutSession(options: CheckoutOptions): Promise<CheckoutSessionResult> {
    // Check if backend payment webhook & keys are configured
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

    if (!razorpayKey && !stripeKey) {
      return {
        success: false,
        code: 'PAYMENTS_NOT_CONFIGURED',
        message: "Payments aren't connected yet. TRUSTLY Plus is currently in preview mode."
      };
    }

    // When real payment provider is attached:
    // Call server-side endpoint `/api/create-checkout-session`
    return {
      success: false,
      code: 'PAYMENTS_NOT_CONFIGURED',
      message: "Payment gateway connection pending server-side webhook configuration."
    };
  }

  /**
   * Verifies payment completion against trusted backend
   */
  public async verifyPayment(sessionId: string): Promise<boolean> {
    // Trusted server-side signature verification only
    return false;
  }

  /**
   * Cancels active subscription
   */
  public async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: "Payments aren't connected yet. Please contact support or your account settings."
    };
  }
}

export const paymentService = PaymentService.getInstance();
