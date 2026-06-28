const SESSION_KEY = 'nvision_session';

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function saveSession(user) {
  const session = {
    user: {
      id: user.id,
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      empresa_vinculada: user.empresa_vinculada,
      modulos_permitidos: user.modulos_permitidos,
      status: user.status,
    },
    expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8h
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session.user;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
