// Shared checkout-session logic. Used by:
//  - worker.js  (Cloudflare Worker entry, deployed)
//  - local-server.mjs (local end-to-end testing)
// The Dodo API key NEVER lives in this file; it is passed in as an argument.

const MODE = 'test'; // flip to 'live' at go-live (along with the SDK mode and key)
const API_BASE = MODE === 'live' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com';

// Origins allowed to call this endpoint, mapped to their post-payment URLs.
const SITES = {
  'https://www.kaelvarnow.com': { base: 'https://www.kaelvarnow.com/' },
  'https://kaelvarnow.com': { base: 'https://kaelvarnow.com/' },
  'https://ericc3473-afk.github.io': { base: 'https://ericc3473-afk.github.io/the-gilded-code/' },
  'http://127.0.0.1:8604': { base: 'http://127.0.0.1:8604/' },
  'http://localhost:8604': { base: 'http://localhost:8604/' },
};

const PRODUCT_ID = 'pdt_0NrdZaVOZ6E7Z5ZiKZIzE';
const SUBSCRIBER_DISCOUNT = 'WELCOME5';

// Dark theme matching the site (warm black, gold, Instrument Sans).
const THEME = {
  theme: 'dark',
  theme_config: {
    radius: '4px',
    font_primary_url: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap',
    font_secondary_url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,500&display=swap',
    pay_button_text: 'Get Instant Access',
    dark: {
      bg_primary: '#0a0a0f',
      bg_secondary: '#12141c',
      border_primary: '#262230',
      border_secondary: '#3a3342',
      text_primary: '#f5f2f6',
      text_secondary: '#b3abbd',
      text_placeholder: '#5d5566',
      text_error: '#f3a0ab',
      text_success: '#ecc76f',
      button_primary: '#ecc76f',
      button_primary_hover: '#f9e4a6',
      button_text_primary: '#231503',
      button_secondary: '#1a1822',
      button_secondary_hover: '#262230',
      button_text_secondary: '#b3abbd',
      input_focus_border: '#ecc76f',
    },
    light: {
      bg_primary: '#f5f2f6',
      bg_secondary: '#ffffff',
      border_primary: '#d8d0e0',
      border_secondary: '#c2b8cc',
      text_primary: '#1a1520',
      text_secondary: '#5d5566',
      text_placeholder: '#9b91a4',
      text_error: '#b3123a',
      text_success: '#1e7a3c',
      button_primary: '#c99b3f',
      button_primary_hover: '#ecc76f',
      button_text_primary: '#231503',
      button_secondary: '#eee9f2',
      button_secondary_hover: '#d8d0e0',
      button_text_secondary: '#5d5566',
      input_focus_border: '#c99b3f',
    },
  },
};

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// Creates a Dodo checkout session for the book.
// `info` = { subscriber: boolean, email: string|null }
// Returns a Response (JSON: {checkout_url} or {error}).
export async function createCheckoutResponse(request, apiKey) {
  const origin = request.headers.get('origin') || '';
  const site = SITES[origin];
  if (!site) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders(origin) });
  }

  let info = { subscriber: false, email: null };
  try {
    const body = await request.json();
    info = {
      subscriber: body && body.subscriber === true,
      email: body && typeof body.email === 'string' ? body.email : null,
    };
  } catch (e) { /* empty body is fine */ }

  const session = {
    product_cart: [{ product_id: PRODUCT_ID, quantity: 1 }],
    billing_currency: 'USD',
    return_url: site.base + 'success.html',
    cancel_url: site.base,
    metadata: { source: 'website', subscriber: info.subscriber ? 'yes' : 'no' },
    customization: THEME,
  };
  if (info.email) {
    // Prefill the buyer's email from newsletter capture; they can still edit it.
    session.customer = { email: info.email };
    session.feature_flags = { allow_customer_editing_email: true };
  }
  if (info.subscriber) {
    session.discount_codes = [SUBSCRIBER_DISCOUNT];
  }

  let resp = await dodoCreate(session, apiKey);
  // If the discount code isn't set up (or expired), retry once without it so checkout still works.
  // Dodo reports unknown discount codes as 404; invalid/expired ones as 422.
  if ((resp.status === 422 || resp.status === 404) && session.discount_codes) {
    delete session.discount_codes;
    resp = await dodoCreate(session, apiKey);
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    return Response.json({ error: 'Checkout session failed', detail: detail.slice(0, 300) }, { status: 502, headers: corsHeaders(origin) });
  }
  const data = await resp.json();
  if (!data.checkout_url) {
    return Response.json({ error: 'No checkout URL returned' }, { status: 502, headers: corsHeaders(origin) });
  }
  // Prefill the buyer's email on the checkout form (documented checkout query parameter).
  let checkoutUrl = data.checkout_url;
  if (info.email) {
    checkoutUrl += (checkoutUrl.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(info.email);
  }
  return Response.json({ checkout_url: checkoutUrl }, { headers: corsHeaders(origin) });
}

async function dodoCreate(session, apiKey) {
  return fetch(API_BASE + '/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(session),
  });
}
