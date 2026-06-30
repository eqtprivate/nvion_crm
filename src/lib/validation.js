import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────────
// Validadores brasileiros
// ──────────────────────────────────────────────────────────────────────────

export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

/** Valida CPF (11 dígitos) incluindo dígitos verificadores. */
export function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais

  const calcDigit = (slice) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i += 1) {
      sum += Number(slice[i]) * (slice.length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calcDigit(cpf.slice(0, 9));
  const d2 = calcDigit(cpf.slice(0, 10));
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/** Valida CNPJ (14 dígitos) incluindo dígitos verificadores. */
export function isValidCNPJ(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // todos iguais

  const calcDigit = (length) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i += 1) {
      sum += Number(cnpj[i]) * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calcDigit(12);
  const d2 = calcDigit(13);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

/** Aceita CPF (11) ou CNPJ (14) válido. */
export function isValidCpfCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

/** Telefone BR: 10 (fixo) ou 11 (celular) dígitos. */
export function isValidPhoneBR(value) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

/** CEP: 8 dígitos. */
export function isValidCEP(value) {
  return onlyDigits(value).length === 8;
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers de schema reutilizáveis
//   Campos opcionais aceitam string vazia (formulários controlados por useState).
// ──────────────────────────────────────────────────────────────────────────

const blank = (val) => val === '' || val == null;

/** String obrigatória (não vazia após trim). */
export const requiredString = (msg = 'Campo obrigatório') =>
  z.string({ required_error: msg }).trim().min(1, msg);

/** String opcional (permite vazio). */
export const optionalString = z.string().trim().optional();

/** Email obrigatório. */
export const requiredEmail = (msg = 'E-mail inválido') =>
  z.string({ required_error: 'E-mail obrigatório' }).trim().min(1, 'E-mail obrigatório').email(msg);

/** Email opcional (permite vazio). */
export const optionalEmail = z
  .string()
  .trim()
  .optional()
  .refine((v) => blank(v) || z.string().email().safeParse(v).success, 'E-mail inválido');

/** Número opcional (string vazia → undefined). */
export const optionalNumber = z.preprocess(
  (v) => (blank(v) ? undefined : Number(v)),
  z.number({ invalid_type_error: 'Valor numérico inválido' }).optional(),
);

/** Número opcional não negativo. */
export const optionalNonNegativeNumber = z.preprocess(
  (v) => (blank(v) ? undefined : Number(v)),
  z.number({ invalid_type_error: 'Valor numérico inválido' }).min(0, 'Deve ser maior ou igual a 0').optional(),
);

/** Número obrigatório e positivo (string vazia → erro). */
export const requiredPositiveNumber = (msg = 'Informe um valor maior que zero') =>
  z.preprocess(
    (v) => (blank(v) ? undefined : Number(v)),
    z.number({ required_error: msg, invalid_type_error: msg }).positive(msg),
  );

/** Percentual opcional (0–100). */
export const optionalPercent = z.preprocess(
  (v) => (blank(v) ? undefined : Number(v)),
  z.number({ invalid_type_error: 'Percentual inválido' }).min(0, 'Mínimo 0%').max(100, 'Máximo 100%').optional(),
);

/** CPF/CNPJ opcional (valida dígitos verificadores quando preenchido). */
export const optionalCpfCnpj = z
  .string()
  .optional()
  .refine((v) => blank(v) || isValidCpfCnpj(v), 'CPF/CNPJ inválido');

/** Telefone BR opcional. */
export const optionalPhone = z
  .string()
  .optional()
  .refine((v) => blank(v) || isValidPhoneBR(v), 'Telefone inválido (use DDD + número)');

/** CEP opcional. */
export const optionalCEP = z
  .string()
  .optional()
  .refine((v) => blank(v) || isValidCEP(v), 'CEP inválido');

/** Data opcional no formato ISO (YYYY-MM-DD) vinda de <input type="date">. */
export const optionalDate = z
  .string()
  .optional()
  .refine((v) => blank(v) || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data inválida');

// ──────────────────────────────────────────────────────────────────────────
// Schemas por entidade (espelham os schemas do Base44)
// ──────────────────────────────────────────────────────────────────────────

export const leadSchema = z.object({
  name: requiredString('Nome é obrigatório'),
  email: optionalEmail,
  phone: optionalPhone,
  origem: z.enum(['indicacao', 'instagram', 'google', 'site', 'whatsapp', 'campanha_paga', 'base_propria', 'parceiro', 'evento', 'outro']).optional(),
  campanha: optionalString,
  produto_interesse: optionalString,
  valor_estimado_carta: optionalNonNegativeNumber,
  administradora_interesse: optionalString,
  vendedor_responsavel: optionalString,
  lider_vinculado: optionalString,
  temperatura: z.enum(['frio', 'morno', 'quente']).optional(),
  status: z.enum(['novo_contato', 'qualificacao', 'simulacao', 'proposta_enviada', 'documentacao', 'em_aprovacao', 'venda_concluida', 'perdida']).optional(),
  data_ultimo_contato: optionalDate,
  tipo_proxima_acao: optionalString,
  data_proxima_acao: optionalDate,
  proxima_acao: optionalString,
  observacoes: optionalString,
}).passthrough();

export const contactSchema = z.object({
  name: requiredString('Nome é obrigatório'),
  email: requiredEmail(),
  phone: optionalPhone,
  cpf_cnpj: optionalCpfCnpj,
  cidade: optionalString,
  estado: optionalString,
  origem: z.enum(['indicacao', 'instagram', 'google', 'site', 'whatsapp', 'campanha_paga', 'base_propria', 'parceiro', 'evento', 'outro']).optional(),
  vendedor_responsavel: optionalString,
  status: z.enum(['lead', 'em_negociacao', 'cliente_ativo', 'venda_concluida', 'perdido', 'inativo']).optional(),
  observacoes: optionalString,
}).passthrough();

export const accountSchema = z.object({
  name: requiredString('Nome da administradora é obrigatório'),
  cnpj: optionalCpfCnpj,
  contato: optionalString,
  email: optionalEmail,
  telefone: optionalPhone,
  prazo_medio_pagamento: optionalNonNegativeNumber,
  formato_relatorio: optionalString,
  status: z.enum(['ativa', 'inativa', 'em_analise', 'suspensa']).optional(),
  observacoes: optionalString,
}).passthrough();

export const opportunitySchema = z.object({
  name: requiredString('Nome da oportunidade é obrigatório'),
  cliente_vinculado: optionalString,
  lead_vinculado: optionalString,
  vendedor: optionalString,
  lider: optionalString,
  administradora_pretendida: optionalString,
  produto: optionalString,
  valor_carta: requiredPositiveNumber('Informe o valor da carta'),
  previsao_fechamento: optionalDate,
  probabilidade: optionalPercent,
  motivo_perda: optionalString,
  status: z.enum(['aberta', 'ganha', 'perdida', 'suspensa']).optional(),
  stage: z.enum(['novo_contato', 'qualificacao', 'simulacao', 'proposta_enviada', 'documentacao', 'em_aprovacao', 'venda_concluida', 'perdida']),
}).passthrough();

export const vendedorSchema = z.object({
  nome: requiredString('Nome do vendedor é obrigatório'),
  email: optionalEmail,
  telefone: optionalPhone,
  cpf_cnpj: optionalCpfCnpj,
  equipe: optionalString,
  lider: optionalString,
  tipo_vendedor: z.enum(['interno', 'parceiro', 'corban', 'lider']).optional(),
  meta_mensal: optionalNonNegativeNumber,
  status: z.enum(['ativo', 'inativo', 'suspenso']).optional(),
  data_inicio: optionalDate,
  observacoes: optionalString,
}).passthrough();

export const equipeSchema = z.object({
  nome_equipe: requiredString('Nome da equipe é obrigatório'),
  lider_responsavel: requiredString('Líder responsável é obrigatório'),
  meta_mensal: optionalNonNegativeNumber,
  status: z.enum(['ativa', 'inativa']).optional(),
  observacoes: optionalString,
}).passthrough();
