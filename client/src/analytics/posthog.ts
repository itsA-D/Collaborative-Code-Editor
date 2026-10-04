import posthog from 'posthog-js';

const API_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
const API_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

const APP_ENVIRONMENT = import.meta.env.DEV ? 'development' : 'production';

/**
 * Selectors whose subtree is private user content: the Monaco surface, the live
 * preview iframe output, authentication fields and free-text snippet naming.
 * Applied to both autocapture and session replay so neither can read them.
 */
const PRIVATE_CONTENT_SELECTORS = [
  '.ph-no-autocapture',
  '[data-ph-no-autocapture]',
  '.ide-code-panel',
  '.ide-editor-content',
  '.monaco-editor',
  '.ide-preview-panel',
  '.preview',
  '.auth-form-grid',
  '.ide-title-input',
  '.board__search-input',
];

/** Text nodes that can contain user-authored or account data. */
const PRIVATE_TEXT_SELECTORS = [
  '.ide-title',
  '.board-card__title',
  '.board-card__updated',
  '.home-nav__user',
  '.collaborator-avatar',
  '.monaco-editor',
].join(', ');

const SENSITIVE_QUERY_PARAMS = /([?&](token|access_token|auth|authorization|jwt|password|email|key|api_key)=)[^&]*/gi;

let initialized = false;
let enabled = false;
let activeUserId: string | null = null;

/**
 * Structural guarantee that no user content can ever leave the browser through
 * the explicit event API: only these keys survive, only as primitives, and each
 * value is length-capped. Anything else is dropped, so a future caller cannot
 * accidentally attach code, titles or tokens.
 */
const ALLOWED_PROPERTIES = new Set([
  'source',
  'language',
  'editor',
  'file_type',
  'authenticated',
  'collaborative',
  'theme',
  'trigger',
]);

const MAX_PROPERTY_LENGTH = 64;

export type SafeProperties = Record<string, string | number | boolean | undefined | null>;

export function sanitizeProperties(properties?: SafeProperties): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  if (!properties) return safe;

  for (const key of Object.keys(properties)) {
    if (!ALLOWED_PROPERTIES.has(key)) continue;
    const value = properties[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'boolean') {
      safe[key] = value;
      continue;
    }
    if (typeof value === 'number') {
      if (Number.isFinite(value)) safe[key] = value;
      continue;
    }
    const text = String(value).slice(0, MAX_PROPERTY_LENGTH);
    if (text) safe[key] = text;
  }

  return safe;
}

function redactUrl(value?: string): string | undefined {
  return typeof value === 'string' ? value.replace(SENSITIVE_QUERY_PARAMS, '$1[REDACTED]') : value;
}

/**
 * Called once from the app entry point. Never awaited and never allowed to throw:
 * a missing key or a PostHog failure leaves the application untouched.
 */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  if (!API_KEY) {
    if (import.meta.env.DEV) {
      console.info('[analytics] disabled: VITE_PUBLIC_POSTHOG_KEY is not set.');
    }
    return;
  }

  try {
    posthog.init(API_KEY, {
      api_host: API_HOST || 'https://us.i.posthog.com',
      defaults: '2026-05-30',
      // Single-page app: the initial load plus every history navigation.
      capture_pageview: 'history_change',
      capture_pageleave: 'if_capture_pageview',
      person_profiles: 'identified_only',
      // No feature flags or experiments are used, so skip the evaluation request.
      advanced_disable_feature_flags: true,
      disable_surveys: true,
      // Autocapture stays on for navigation/interaction signals, but it is never
      // allowed to read element text or attributes: snippet titles and account
      // details are user data.
      autocapture: {
        css_selector_ignorelist: PRIVATE_CONTENT_SELECTORS,
        capture_copied_text: false,
      },
      mask_all_text: true,
      mask_all_element_attributes: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: PRIVATE_TEXT_SELECTORS,
        // Response bodies carry snippet source; never stream them.
        streamNetworkBody: false,
        blockSelector: [
          '.ide-code-panel',
          '.ide-preview-panel',
          '.auth-form-grid',
          '.ide-title-input',
          '.board__search-input',
        ].join(', '),
        maskCapturedNetworkRequestFn: (request) => {
          try {
            // PerformanceEntry#name is the request URL.
            request.name = redactUrl(request.name) || request.name;
            // Bodies carry snippet source and headers carry the auth token.
            request.requestBody = null;
            request.responseBody = null;
            request.requestHeaders = {};
            request.responseHeaders = {};
            return request;
          } catch {
            return null;
          }
        },
      },
    });

    posthog.register({ app_environment: APP_ENVIRONMENT });
    enabled = true;
  } catch (error) {
    enabled = false;
    console.warn('[analytics] initialization failed; continuing without analytics.', error);
  }
}

export function isAnalyticsEnabled(): boolean {
  return enabled;
}

export function captureEvent(event: string, properties?: SafeProperties): void {
  if (!enabled) return;
  try {
    posthog.capture(event, sanitizeProperties(properties));
  } catch {
    /* analytics must never surface errors to the user */
  }
}

/**
 * Links events to the account's stable internal id. No email, name or token is
 * attached, and a different account in the same browser starts from a clean
 * anonymous identity instead of inheriting the previous one.
 */
export function identifyUser(userId?: string | null): void {
  if (!enabled || !userId) return;
  try {
    if (activeUserId && activeUserId !== userId) {
      posthog.reset();
    }
    activeUserId = userId;
    posthog.identify(userId);
  } catch {
    /* ignore */
  }
}

export function resetAnalyticsIdentity(): void {
  activeUserId = null;
  if (!enabled) return;
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}

/**
 * Leading + trailing throttle. Guarantees one event during sustained activity and
 * one after a burst stops, instead of starving a plain debounce or firing on
 * every keystroke.
 */
export function createThrottledCapture(
  event: string,
  getProperties: () => SafeProperties,
  waitMs: number
): () => void {
  let lastSentAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (!enabled) return;

    const send = () => {
      timer = null;
      lastSentAt = Date.now();
      captureEvent(event, getProperties());
    };

    const elapsed = Date.now() - lastSentAt;
    if (elapsed >= waitMs) {
      send();
      return;
    }
    if (timer === null) {
      timer = setTimeout(send, waitMs - elapsed);
    }
  };
}
