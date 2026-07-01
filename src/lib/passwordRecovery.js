const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

export function getPasswordRecoveryRedirectUrl() {
  if (typeof window === 'undefined') return undefined;

  const configuredUrl = normalizeOrigin(import.meta.env.VITE_PUBLIC_APP_URL);
  const origin = configuredUrl || window.location.origin;
  return `${origin}/Profile`;
}
