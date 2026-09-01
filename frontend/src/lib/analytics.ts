import apiClient from '../api/client';
import type { EventType } from '../types/analytics.types';

// ─────────────────────────────────────────────────────────────────────────────
// Session ID — generated once per browser session, stored in localStorage
// ─────────────────────────────────────────────────────────────────────────────

function generateId(): string {
  // crypto.randomUUID() is available in all modern browsers
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const SESSION_KEY = 'sp_session_id';

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// trackEvent — fire-and-forget, never throws, never blocks the UI
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackEventOptions {
  eventType: EventType;
  /** Product ObjectId — only for product_view and product_enquiry */
  productId?: string;
  metadata?: Record<string, unknown>;
}

export function trackEvent({ eventType, productId, metadata }: TrackEventOptions): void {
  const sessionId = getSessionId();

  apiClient
    .post(
      '/analytics/events',
      {
        eventType,
        ...(productId ? { productId } : {}),
        ...(metadata  ? { metadata  } : {}),
      },
      {
        headers: { 'x-session-id': sessionId },
      },
    )
    .catch((err) => {
      // Analytics failures must never surface to the user
      console.debug('[analytics] failed to track event:', eventType, err?.message ?? err);
    });
}
