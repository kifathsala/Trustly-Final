export type AnalyticsEvent = 
  | 'premium_page_viewed'
  | 'upgrade_clicked'
  | 'checkout_started'
  | 'payment_completed'
  | 'subscription_cancelled';

export interface AnalyticsPayload {
  planId?: 'monthly' | 'yearly';
  source?: string;
  [key: string]: any;
}

/**
 * Privacy-respecting event tracker.
 * STRICT DIRECTIVE: Never track private journal content, private AI conversations,
 * or sensitive relationship thoughts.
 */
export const trackEvent = (event: AnalyticsEvent, payload?: AnalyticsPayload): void => {
  // Sanitize payload to guarantee no private text is captured
  const sanitizedPayload: AnalyticsPayload = {
    planId: payload?.planId,
    source: payload?.source,
    timestamp: new Date().toISOString()
  };

  // Safe developer inspection without telemetry leakage
  if (import.meta.env.DEV) {
    // event recorded safely
  }
};
