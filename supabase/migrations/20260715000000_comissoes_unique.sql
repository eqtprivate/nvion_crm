-- Evita comissões duplicadas por venda (corrida do backfill no cliente).
--
-- Contexto: a geração retroativa de comissões roda no cliente e é guardada
-- apenas por uma ref em memória; com duas sessões simultâneas era possível
-- criar mais de uma linha em public.comissoes para a mesma venda.

-- 1) Remove duplicatas existentes, mantendo a mais recente por
--    (empresa_id, venda_vinculada). Desempate por id quando created_at empata.
delete from public.comissoes c
using public.comissoes d
where c.venda_vinculada is not null
  and c.venda_vinculada = d.venda_vinculada
  and coalesce(c.empresa_id::text, '') = coalesce(d.empresa_id::text, '')
  and (
    c.created_at < d.created_at
    or (c.created_at = d.created_at and c.id < d.id)
  );

-- 2) Índice único parcial: no máximo uma comissão por venda por empresa.
create unique index if not exists comissoes_venda_uniq
  on public.comissoes (empresa_id, venda_vinculada)
  where venda_vinculada is not null;
