import { createFalClient } from "@fal-ai/client";

/**
 * Default fal client configured for proxy mode.
 * The proxy at /api/fal/proxy handles auth via .env.local FAL_KEY.
 */
export const fal = createFalClient({
  proxyUrl: "/api/fal/proxy",
});

/**
 * Create a fal client with a custom API key (for browser-configured keys).
 * Falls back to proxy mode if no key is provided.
 */
export function createFalWithKey(apiKey?: string) {
  if (apiKey) {
    return createFalClient({
      credentials: apiKey,
    });
  }
  return fal;
}
