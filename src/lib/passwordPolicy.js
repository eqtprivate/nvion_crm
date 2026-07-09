// Política de senha do NVION — usada em todas as telas que definem senha
// (redefinição, troca no perfil, troca obrigatória no login).
//
// Regras: mínimo 8 caracteres, com ao menos uma letra maiúscula, uma minúscula,
// um dígito e um caractere especial. Mantenha em sincronia com a configuração
// de "Password Requirements" do Supabase Auth (painel).

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_RULES = [
  { key: 'length', label: `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`, test: (v) => v.length >= PASSWORD_MIN_LENGTH },
  { key: 'lower', label: 'Uma letra minúscula (a-z)', test: (v) => /[a-z]/.test(v) },
  { key: 'upper', label: 'Uma letra maiúscula (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { key: 'digit', label: 'Um número (0-9)', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'Um caractere especial (!@#$…)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/**
 * Valida a senha contra a política.
 * @returns {{ ok: boolean, failed: string[], firstMessage: string|null }}
 */
export function validatePassword(value) {
  const pw = String(value ?? '');
  const failed = PASSWORD_RULES.filter((rule) => !rule.test(pw)).map((rule) => rule.label);
  return {
    ok: failed.length === 0,
    failed,
    firstMessage: failed.length > 0 ? `A senha precisa de: ${failed[0].toLowerCase()}` : null,
  };
}

/** Estado por regra, para mostrar checklist ao vivo no formulário. */
export function passwordChecklist(value) {
  const pw = String(value ?? '');
  return PASSWORD_RULES.map((rule) => ({ key: rule.key, label: rule.label, ok: rule.test(pw) }));
}
