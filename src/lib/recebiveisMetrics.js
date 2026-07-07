// ──────────────────────────────────────────────────────────────────────────
// Camada de métricas da carteira de recebíveis (Sprint 4.5).
// Funções PURAS (sem React/rede) que agregam registros de `recebiveis_consorcio`
// em indicadores reutilizáveis — pelo Painel de Recebíveis e, depois, pelo motor
// de limite de antecipação (Sprint 5).
//
// Cada recebível é uma parcela de comissão a receber, com:
//   valor_recebivel, data_prevista_recebimento, data_recebimento_real,
//   status_recebivel (previsto|confirmado|recebido|atrasado|cancelado),
//   elegivel_antecipacao, motivo_inelegibilidade, administradora, vendedor, produto.
// ──────────────────────────────────────────────────────────────────────────

export const STATUS_A_RECEBER = ['previsto', 'confirmado', 'atrasado'];
export const STATUS_RECEBIDO = ['recebido'];

export const AGING_BUCKETS = [
  { key: 'vencido', label: 'Vencido' },
  { key: 'd0_30', label: '0–30 dias' },
  { key: 'd31_60', label: '31–60 dias' },
  { key: 'd61_90', label: '61–90 dias' },
  { key: 'd90p', label: '+90 dias' },
];

export function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseISODate(value) {
  if (!value) return null;
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffDays(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

export function monthKey(value) {
  const d = parseISODate(value);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const isAtivo = (r) => r.status_recebivel !== 'cancelado';
const isAReceber = (r) => STATUS_A_RECEBER.includes(r.status_recebivel);
const isRecebido = (r) => STATUS_RECEBIDO.includes(r.status_recebivel);

/** KPIs de topo da carteira. */
export function resumoCarteira(recebiveis = []) {
  const ativos = recebiveis.filter(isAtivo);
  const soma = (arr) => arr.reduce((s, r) => s + toNum(r.valor_recebivel), 0);
  const aReceber = ativos.filter(isAReceber);
  const recebido = ativos.filter(isRecebido);
  const atrasado = ativos.filter((r) => r.status_recebivel === 'atrasado');
  const elegivel = aReceber.filter((r) => r.elegivel_antecipacao);
  return {
    carteira: soma(ativos),
    aReceber: soma(aReceber),
    recebido: soma(recebido),
    atrasado: soma(atrasado),
    elegivel: soma(elegivel),
    qtdAReceber: aReceber.length,
    qtdElegivel: elegivel.length,
  };
}

/** Fluxo previsto de caixa: valor a receber agrupado por mês de vencimento. */
export function carteiraFuturaPorMes(recebiveis = []) {
  const map = new Map();
  for (const r of recebiveis.filter(isAtivo).filter(isAReceber)) {
    const mes = monthKey(r.data_prevista_recebimento);
    if (!mes) continue;
    map.set(mes, (map.get(mes) || 0) + toNum(r.valor_recebivel));
  }
  return [...map.entries()]
    .map(([mes, valor]) => ({ mes, valor }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

/** Aging da carteira a receber, por faixa de dias até o vencimento (hoje = ref). */
export function agingCarteira(recebiveis = [], hoje = new Date()) {
  const acc = { vencido: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90p: 0 };
  for (const r of recebiveis.filter(isAtivo).filter(isAReceber)) {
    const venc = parseISODate(r.data_prevista_recebimento);
    const valor = toNum(r.valor_recebivel);
    if (!venc) { acc.d90p += valor; continue; }
    const dias = diffDays(hoje, venc); // negativo = já vencido
    if (dias < 0) acc.vencido += valor;
    else if (dias <= 30) acc.d0_30 += valor;
    else if (dias <= 60) acc.d31_60 += valor;
    else if (dias <= 90) acc.d61_90 += valor;
    else acc.d90p += valor;
  }
  return AGING_BUCKETS.map((b) => ({ key: b.key, label: b.label, valor: acc[b.key] }));
}

/** Elegibilidade para antecipação (sobre a carteira a receber). */
export function elegibilidade(recebiveis = []) {
  const aReceber = recebiveis.filter(isAtivo).filter(isAReceber);
  const soma = (arr) => arr.reduce((s, r) => s + toNum(r.valor_recebivel), 0);
  const elegiveis = aReceber.filter((r) => r.elegivel_antecipacao);
  const inelegiveis = aReceber.filter((r) => !r.elegivel_antecipacao);
  const total = soma(aReceber);
  const motivoMap = new Map();
  for (const r of inelegiveis) {
    const motivo = (r.motivo_inelegibilidade || 'Não informado').trim() || 'Não informado';
    motivoMap.set(motivo, (motivoMap.get(motivo) || 0) + toNum(r.valor_recebivel));
  }
  return {
    elegivelValor: soma(elegiveis),
    inelegivelValor: soma(inelegiveis),
    elegivelPct: total > 0 ? (soma(elegiveis) / total) * 100 : 0,
    porMotivo: [...motivoMap.entries()]
      .map(([motivo, valor]) => ({ motivo, valor }))
      .sort((a, b) => b.valor - a.valor),
  };
}

/** Concentração de risco por dimensão (administradora, vendedor, produto). */
export function concentracaoPor(recebiveis = [], campo, limite = 8) {
  const map = new Map();
  const ativos = recebiveis.filter(isAtivo).filter(isAReceber);
  for (const r of ativos) {
    const chave = (r[campo] || '—').toString();
    map.set(chave, (map.get(chave) || 0) + toNum(r.valor_recebivel));
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  const ordenado = [...map.entries()]
    .map(([chave, valor]) => ({ chave, valor, pct: total > 0 ? (valor / total) * 100 : 0 }))
    .sort((a, b) => b.valor - a.valor);
  if (ordenado.length <= limite) return ordenado;
  const top = ordenado.slice(0, limite - 1);
  const resto = ordenado.slice(limite - 1);
  const valorResto = resto.reduce((s, r) => s + r.valor, 0);
  return [...top, { chave: 'Outros', valor: valorResto, pct: total > 0 ? (valorResto / total) * 100 : 0 }];
}

/** Realizado x Previsto: taxa de conversão de recebível em recebimento. */
export function realizadoVsPrevisto(recebiveis = []) {
  const ativos = recebiveis.filter(isAtivo);
  const soma = (arr) => arr.reduce((s, r) => s + toNum(r.valor_recebivel), 0);
  const recebido = soma(ativos.filter(isRecebido));
  const aReceber = soma(ativos.filter(isAReceber));
  const base = recebido + aReceber;
  return {
    recebido,
    aReceber,
    taxaConversao: base > 0 ? (recebido / base) * 100 : 0,
  };
}

/** Índice de atraso: valor vencido / carteira a receber ativa. */
export function indiceAtraso(recebiveis = [], hoje = new Date()) {
  const aReceber = recebiveis.filter(isAtivo).filter(isAReceber);
  const soma = (arr) => arr.reduce((s, r) => s + toNum(r.valor_recebivel), 0);
  const vencido = aReceber.filter((r) => {
    const venc = parseISODate(r.data_prevista_recebimento);
    return r.status_recebivel === 'atrasado' || (venc && diffDays(hoje, venc) < 0);
  });
  const carteira = soma(aReceber);
  return {
    valorVencido: soma(vencido),
    carteiraAReceber: carteira,
    indice: carteira > 0 ? (soma(vencido) / carteira) * 100 : 0,
  };
}

/** Prazo médio (dias) entre criação do recebível e o vencimento previsto / recebimento real. */
export function prazosMedios(recebiveis = []) {
  const medias = (arr, campoFim) => {
    const dias = arr
      .map((r) => {
        const ini = parseISODate(r.created_date || r.created_at);
        const fim = parseISODate(r[campoFim]);
        return ini && fim ? diffDays(ini, fim) : null;
      })
      .filter((d) => d != null);
    return dias.length ? Math.round(dias.reduce((s, d) => s + d, 0) / dias.length) : 0;
  };
  const ativos = recebiveis.filter(isAtivo);
  return {
    prazoMedioPrevisto: medias(ativos.filter(isAReceber), 'data_prevista_recebimento'),
    prazoMedioRealizado: medias(ativos.filter(isRecebido), 'data_recebimento_real'),
  };
}

/**
 * Base histórica da empresa — insumo direto das faixas de antecipação (Sprint 5):
 * meses de operação (desde o 1º recebível) e volume já recebido.
 */
export function historicoEmpresa(recebiveis = [], hoje = new Date()) {
  const datas = recebiveis
    .map((r) => parseISODate(r.created_date || r.created_at) || parseISODate(r.data_prevista_recebimento))
    .filter(Boolean)
    .sort((a, b) => a - b);
  const primeiraData = datas[0] || null;
  const diasOperacao = primeiraData ? diffDays(primeiraData, hoje) : 0;
  const volumeRecebido = recebiveis
    .filter(isRecebido)
    .reduce((s, r) => s + toNum(r.valor_recebivel), 0);
  return {
    primeiraData: primeiraData ? primeiraData.toISOString().slice(0, 10) : null,
    diasOperacao,
    mesesOperacao: Math.floor(diasOperacao / 30),
    volumeRecebido,
  };
}

/** Agrega todas as métricas de uma vez (usado pelo Painel de Recebíveis). */
export function computeRecebiveisMetrics(recebiveis = [], hoje = new Date()) {
  return {
    resumo: resumoCarteira(recebiveis),
    fluxoPorMes: carteiraFuturaPorMes(recebiveis),
    aging: agingCarteira(recebiveis, hoje),
    elegibilidade: elegibilidade(recebiveis),
    concentracaoAdministradora: concentracaoPor(recebiveis, 'administradora'),
    concentracaoVendedor: concentracaoPor(recebiveis, 'vendedor'),
    concentracaoProduto: concentracaoPor(recebiveis, 'produto'),
    realizadoVsPrevisto: realizadoVsPrevisto(recebiveis),
    indiceAtraso: indiceAtraso(recebiveis, hoje),
    prazos: prazosMedios(recebiveis),
    historico: historicoEmpresa(recebiveis, hoje),
  };
}
