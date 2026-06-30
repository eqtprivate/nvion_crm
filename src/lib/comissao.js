// ──────────────────────────────────────────────────────────────────────────
// Modelo flexível de Regras de Comissão para Consórcio.
// Separa explicitamente:
//   1. comissão total da regra
//   2. cronograma de pagamento (parcelas)
//   3. distribuição interna (vendedor / líder / empresa)
//   4. política de estorno
// ──────────────────────────────────────────────────────────────────────────

export const TIPOS_REGRA = [
  { value: 'percentual_fixo', label: 'Percentual fixo à vista' },
  { value: 'percentual_parcelado_igual', label: 'Percentual parcelado igual' },
  { value: 'percentual_parcelado_customizado', label: 'Percentual parcelado customizado' },
  { value: 'valor_fixo', label: 'Valor fixo' },
  { value: 'hibrido', label: 'Híbrido (percentual + valor fixo)' },
  { value: 'faixa_variavel', label: 'Faixa variável' },
];

export const BASES_CALCULO = [
  { value: 'valor_carta', label: 'Valor da carta' },
  { value: 'valor_credito', label: 'Valor do crédito' },
  { value: 'taxa_administracao', label: 'Taxa de administração' },
  { value: 'valor_comissao_administradora', label: 'Comissão informada pela administradora' },
  { value: 'valor_manual', label: 'Valor manual' },
];

export const FORMAS_PAGAMENTO = [
  { value: 'a_vista', label: 'À vista' },
  { value: 'parcelado', label: 'Parcelado' },
  { value: 'customizado', label: 'Customizado' },
];

export const GATILHOS_PAGAMENTO = [
  { value: 'venda_criada', label: 'Venda criada' },
  { value: 'venda_confirmada', label: 'Venda confirmada' },
  { value: 'conciliacao_confirmada', label: 'Conciliação confirmada' },
  { value: 'pagamento_administradora', label: 'Pagamento da administradora' },
  { value: 'pagamento_cliente', label: 'Pagamento do cliente' },
];

export const STATUS_REGRA = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'inativa', label: 'Inativa' },
  { value: 'arquivada', label: 'Arquivada' },
];

/** Arredonda para 2 casas decimais de forma controlada (evita ruído de float). */
export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Soma os percentuais de uma lista de parcelas. */
export function somaPercentuais(parcelas) {
  return round2((parcelas || []).reduce((sum, p) => sum + (Number(p.percentual_parcela) || 0), 0));
}

/** Soma os valores fixos de uma lista de parcelas. */
export function somaValoresFixos(parcelas) {
  return round2((parcelas || []).reduce((sum, p) => sum + (Number(p.valor_fixo_parcela) || 0), 0));
}

/**
 * Indica se a regra usa o modelo novo (cabeçalho flexível) ou é uma regra legada
 * (apenas percentual_base / percentual_vendedor / percentual_lider).
 */
export function isRegraNova(regra) {
  if (!regra) return false;
  return (
    Number(regra.percentual_total) > 0 ||
    Number(regra.valor_fixo_total) > 0 ||
    (regra.tipo_regra_comissao && regra.tipo_regra_comissao !== 'percentual_fixo')
  );
}

/**
 * Resolve o cronograma de parcelas da regra.
 * @param {object} regra cabeçalho da regra
 * @param {Array} parcelasCustomizadas registros de ParcelasRegraComissao (para customizado)
 * @returns {Array} lista normalizada de parcelas
 *   { numero_parcela, percentual_parcela, valor_fixo_parcela, dias_apos_venda, gatilho_parcela, estornavel }
 */
export function resolverCronograma(regra, parcelasCustomizadas = []) {
  if (!regra) return [];
  const tipo = regra.tipo_regra_comissao || 'percentual_fixo';
  const gatilho = regra.gatilho_pagamento || 'venda_criada';
  const prazo = Number(regra.prazo_primeiro_pagamento_dias || regra.prazo_pagamento_dias || 30);
  const qtd = Math.max(1, Number(regra.quantidade_parcelas_comissionaveis || 1));
  const total = Number(regra.percentual_total || regra.percentual_base || 0);
  const estornavelPadrao = !!regra.possui_estorno && !regra.sem_estorno;

  const mk = (numero, extra) => ({
    numero_parcela: numero,
    percentual_parcela: 0,
    valor_fixo_parcela: 0,
    dias_apos_venda: prazo + (numero - 1) * 30,
    gatilho_parcela: gatilho,
    estornavel: estornavelPadrao,
    ...extra,
  });

  if (tipo === 'percentual_parcelado_customizado') {
    const ordenadas = [...(parcelasCustomizadas || [])].sort(
      (a, b) => (a.numero_parcela || 0) - (b.numero_parcela || 0)
    );
    if (ordenadas.length === 0) return [mk(1, { percentual_parcela: round2(total) })];
    return ordenadas.map((p, idx) =>
      mk(p.numero_parcela || idx + 1, {
        percentual_parcela: round2(p.percentual_parcela),
        valor_fixo_parcela: round2(p.valor_fixo_parcela),
        dias_apos_venda: p.dias_apos_venda != null ? Number(p.dias_apos_venda) : prazo + idx * 30,
        gatilho_parcela: p.gatilho_parcela || gatilho,
        estornavel: p.estornavel != null ? !!p.estornavel : estornavelPadrao,
      })
    );
  }

  if (tipo === 'percentual_parcelado_igual') {
    const porParcela = round2(total / qtd);
    return Array.from({ length: qtd }, (_, i) =>
      mk(i + 1, {
        // ajusta a última parcela para fechar exatamente o total
        percentual_parcela: i === qtd - 1 ? round2(total - porParcela * (qtd - 1)) : porParcela,
      })
    );
  }

  if (tipo === 'valor_fixo') {
    const totalFixo = Number(regra.valor_fixo_total || 0);
    const forma = regra.forma_pagamento || 'a_vista';
    const nFixo = forma === 'a_vista' ? 1 : qtd;
    const porParcela = round2(totalFixo / nFixo);
    return Array.from({ length: nFixo }, (_, i) =>
      mk(i + 1, {
        valor_fixo_parcela: i === nFixo - 1 ? round2(totalFixo - porParcela * (nFixo - 1)) : porParcela,
      })
    );
  }

  if (tipo === 'hibrido') {
    // percentual no cronograma + valor fixo adicional concentrado na 1ª parcela
    const forma = regra.forma_pagamento || 'a_vista';
    const nHib = forma === 'a_vista' ? 1 : qtd;
    const porParcela = round2(total / nHib);
    return Array.from({ length: nHib }, (_, i) =>
      mk(i + 1, {
        percentual_parcela: i === nHib - 1 ? round2(total - porParcela * (nHib - 1)) : porParcela,
        valor_fixo_parcela: i === 0 ? round2(regra.valor_fixo_total) : 0,
      })
    );
  }

  if (tipo === 'faixa_variavel') {
    // MVP: usa o mínimo como efetivo, parcela única (placeholder estruturado)
    const efetivo = Number(regra.comissao_min || regra.percentual_total || 0);
    return [mk(1, { percentual_parcela: round2(efetivo) })];
  }

  // percentual_fixo (à vista) — também é o caminho de compatibilidade legada
  return [mk(1, { percentual_parcela: round2(total) })];
}

/** Seleciona o valor base de cálculo a partir da venda. */
export function baseDeCalculo(regra, venda) {
  const base = regra?.base_calculo || 'valor_carta';
  switch (base) {
    case 'valor_comissao_administradora':
      return Number(venda?.valor_comissao_administradora || venda?.valor_carta || 0);
    case 'taxa_administracao':
      return Number(venda?.valor_taxa_administracao || venda?.valor_carta || 0);
    case 'valor_credito':
      return Number(venda?.valor_credito || venda?.valor_carta || 0);
    case 'valor_manual':
      return Number(venda?.base_calculo_manual || venda?.valor_carta || 0);
    case 'valor_carta':
    default:
      return Number(venda?.valor_carta || 0);
  }
}

/**
 * Calcula a comissão completa de uma venda a partir da regra nova.
 * Mantém vendedor/líder/empresa como percentuais independentes sobre a MESMA base
 * da operação (não líder como % da comissão do vendedor).
 *
 * @returns {{
 *   base, valorComissaoTotal, totalVendedor, totalLider, totalEmpresa, parcelas
 * }}
 */
export function calcularComissao(regra, venda, parcelasCustomizadas = []) {
  const base = baseDeCalculo(regra, venda);
  const cronograma = resolverCronograma(regra, parcelasCustomizadas);

  const parcelas = cronograma.map((p) => {
    const valorPct = base * (Number(p.percentual_parcela) || 0) / 100;
    const valorTotalParcela = round2(valorPct + (Number(p.valor_fixo_parcela) || 0));
    return { ...p, valor_parcela_total: valorTotalParcela };
  });

  const valorComissaoTotal = round2(parcelas.reduce((s, p) => s + p.valor_parcela_total, 0));

  // distribuição sobre a base da operação (percentuais independentes)
  const pv = Number(regra?.percentual_vendedor || 0);
  const pl = Number(regra?.percentual_lider || 0);
  const pe = Number(regra?.percentual_empresa || 0);
  const totalVendedor = round2(base * pv / 100);
  const totalLider = round2(base * pl / 100);
  const totalEmpresa = pe > 0
    ? round2(base * pe / 100)
    : round2(Math.max(0, valorComissaoTotal - totalVendedor - totalLider));

  // rateio por parcela proporcional à participação da parcela na comissão total
  const parcelasComRateio = parcelas.map((p) => {
    const share = valorComissaoTotal > 0 ? p.valor_parcela_total / valorComissaoTotal : 0;
    return {
      ...p,
      valor_parcela_vendedor: round2(totalVendedor * share),
      valor_parcela_lider: round2(totalLider * share),
      valor_parcela_empresa: round2(totalEmpresa * share),
    };
  });

  return {
    base,
    valorComissaoTotal,
    totalVendedor,
    totalLider,
    totalEmpresa,
    parcelas: parcelasComRateio,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Templates rápidos de regra
// ──────────────────────────────────────────────────────────────────────────

export const TEMPLATES_REGRA = [
  {
    id: 'avista_3',
    label: 'À vista 3%',
    apply: () => ({
      tipo_regra_comissao: 'percentual_fixo',
      base_calculo: 'valor_carta',
      forma_pagamento: 'a_vista',
      percentual_total: 3,
      quantidade_parcelas_comissionaveis: 1,
      sem_estorno: true,
      possui_estorno: false,
      parcelas: [],
    }),
  },
  {
    id: 'avista_28',
    label: 'À vista 2,8%',
    apply: () => ({
      tipo_regra_comissao: 'percentual_fixo',
      base_calculo: 'valor_carta',
      forma_pagamento: 'a_vista',
      percentual_total: 2.8,
      quantidade_parcelas_comissionaveis: 1,
      sem_estorno: true,
      possui_estorno: false,
      parcelas: [],
    }),
  },
  {
    id: 'parc_4_4',
    label: 'Parcelado 4% em 4 (1,5/1,0/1,0/0,5)',
    apply: () => ({
      tipo_regra_comissao: 'percentual_parcelado_customizado',
      base_calculo: 'valor_carta',
      forma_pagamento: 'customizado',
      percentual_total: 4,
      quantidade_parcelas_comissionaveis: 4,
      possui_estorno: true,
      sem_estorno: false,
      percentual_estorno: 0.5,
      parcela_referencia_estorno: 6,
      parcelas: [
        { numero_parcela: 1, percentual_parcela: 1.5 },
        { numero_parcela: 2, percentual_parcela: 1.0 },
        { numero_parcela: 3, percentual_parcela: 1.0 },
        { numero_parcela: 4, percentual_parcela: 0.5 },
      ],
    }),
  },
  {
    id: 'parc_2_4',
    label: 'Parcelado 2% em 4 (0,75/0,5/0,5/0,25)',
    apply: () => ({
      tipo_regra_comissao: 'percentual_parcelado_customizado',
      base_calculo: 'valor_carta',
      forma_pagamento: 'customizado',
      percentual_total: 2,
      quantidade_parcelas_comissionaveis: 4,
      possui_estorno: true,
      sem_estorno: false,
      percentual_estorno: 0.25,
      parcela_referencia_estorno: 6,
      parcelas: [
        { numero_parcela: 1, percentual_parcela: 0.75 },
        { numero_parcela: 2, percentual_parcela: 0.5 },
        { numero_parcela: 3, percentual_parcela: 0.5 },
        { numero_parcela: 4, percentual_parcela: 0.25 },
      ],
    }),
  },
  {
    id: 'parc_4_10',
    label: 'Parcelado 4% em 10 iguais (Pesados/TPL)',
    apply: () => ({
      tipo_regra_comissao: 'percentual_parcelado_igual',
      base_calculo: 'valor_carta',
      forma_pagamento: 'parcelado',
      percentual_total: 4,
      quantidade_parcelas_comissionaveis: 10,
      sem_estorno: true,
      possui_estorno: false,
      parcelas: [],
    }),
  },
  {
    id: 'parc_4_12',
    label: 'Parcelado 4% em 12 iguais sem estorno',
    apply: () => ({
      tipo_regra_comissao: 'percentual_parcelado_igual',
      base_calculo: 'valor_carta',
      forma_pagamento: 'parcelado',
      percentual_total: 4,
      quantidade_parcelas_comissionaveis: 12,
      sem_estorno: true,
      possui_estorno: false,
      parcelas: [],
    }),
  },
  {
    id: 'custom',
    label: 'Customizado manual',
    apply: () => ({
      tipo_regra_comissao: 'percentual_parcelado_customizado',
      base_calculo: 'valor_carta',
      forma_pagamento: 'customizado',
      percentual_total: 0,
      quantidade_parcelas_comissionaveis: 1,
      possui_estorno: false,
      sem_estorno: false,
      parcelas: [{ numero_parcela: 1, percentual_parcela: 0 }],
    }),
  },
];
