// Cloudflare Worker entry. Deploy with: npx wrangler deploy  (from this folder)
// Set the secret with:      npx wrangler secret put DODO_API_KEY

import { createCheckoutResponse } from './worker.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/create-checkout') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: {
          'Access-Control-Allow-Origin': request.headers.get('origin') || '',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        } });
      }
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      return createCheckoutResponse(request, env.DODO_API_KEY);
    }
    return new Response('Not found', { status: 404 });
  },
};
