const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');
const DEFAULT_PUBLIC_APP_URL = 'https://nvion.base44.app';

function isLocalhostOrigin(value) {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function getPasswordRecoveryRedirectUrl() {
  if (typeof window === 'undefined') return undefined;

  const configuredUrl = normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL);
  const currentOrigin = normalizeOrigin(window.location.origin);
  const origin = configuredUrl || (isLocalhostOrigin(currentOrigin) ? DEFAULT_PUBLIC_APP_URL : currentOrigin) || DEFAULT_PUBLIC_APP_URL;
  return `${origin}/Profile`;
}
