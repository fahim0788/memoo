/**
 * Event Tracker - Track user/visitor behavior for funnel analysis
 * Tracking is session-based (sessionId), includes userId if authenticated
 */

import { getToken } from './auth';

// Generate or retrieve session ID (stored in localStorage)
function getSessionId(): string {
  const key = "memoo_session_id";
  let sessionId = localStorage.getItem(key);

  if (!sessionId) {
    // Generate new session ID (v4-like random string)
    sessionId = `session_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    localStorage.setItem(key, sessionId);
  }

  return sessionId;
}

interface EventData {
  type: string;
  category: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * Track an event
 */
export async function trackEvent(data: EventData): Promise<void> {
  try {
    const sessionId = getSessionId();

    const payload = {
      sessionId,
      type: data.type,
      category: data.category,
      action: data.action || undefined,
      metadata: data.metadata || {},
    };

    // Build headers - include auth token if available
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Send to API (fire and forget, no error throwing)
    await fetch("/api/events", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }).catch((err) => {
      // Silently fail - don't break user experience if tracking fails
      console.warn("[Event Tracker] Failed to send event:", err);
    });
  } catch (err) {
    // Silently fail
    console.warn("[Event Tracker] Error tracking event:", err);
  }
}

/**
 * Track page visit
 */
export function trackPageVisit(page: string, metadata?: Record<string, any>): void {
  trackEvent({
    type: "PAGE_VISITED",
    category: "AUTH",
    action: `${page.toUpperCase()}_VIEWED`,
    metadata: {
      page,
      referrer: document.referrer || null,
      ...metadata,
    },
  });
}

/**
 * Track registration started
 */
export function trackRegistrationStarted(): void {
  trackEvent({
    type: "REGISTRATION_STARTED",
    category: "AUTH",
    action: "REGISTRATION_FORM_OPENED",
  });
}

/**
 * Track registration completed
 */
export function trackRegistrationCompleted(email?: string): void {
  trackEvent({
    type: "REGISTRATION_COMPLETED",
    category: "AUTH",
    action: "REGISTRATION_SUBMITTED",
    metadata: {
      hasEmail: !!email,
    },
  });
}

/**
 * Track email verification sent
 */
export function trackEmailVerificationSent(email?: string): void {
  trackEvent({
    type: "EMAIL_VERIFICATION_SENT",
    category: "EMAIL",
    action: "VERIFICATION_CODE_SENT",
    metadata: {
      hasEmail: !!email,
    },
  });
}

/**
 * Track reminder sent (used by worker)
 */
export function trackReminderSent(reminderNumber: 1 | 2 | 3, email?: string): void {
  trackEvent({
    type: `REMINDER_${reminderNumber}_SENT`,
    category: "EMAIL",
    action: `REMINDER_${reminderNumber}_EMAIL_SENT`,
    metadata: {
      reminderNumber,
      hasEmail: !!email,
    },
  });
}

/**
 * Track account deleted (used by worker)
 */
export function trackAccountDeleted(reason?: string): void {
  trackEvent({
    type: "ACCOUNT_DELETED",
    category: "CLEANUP",
    action: "UNVERIFIED_ACCOUNT_DELETED",
    metadata: {
      reason: reason || "UNVERIFIED_AFTER_21_DAYS",
    },
  });
}
