# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).
Versionamento segue a `APP_VERSION` (`src/lib/version.js`).

## [1.16.3] — 2026-07

### Corrigido
- Robustez da Sprint 2 (Comissões): índice único por venda (`comissoes_venda_uniq`)
  com dedupe prévio; backfill materializa parcelas e ignora violação de unicidade;
  mudança de status propaga às `ParcelasComissao` não terminais.
- Recebíveis com valor zerado no caminho da engine nova de regras (usa o total
  calculado da comissão como fallback).

### Documentação
- Roadmap atualizado com o estado real do projeto (seção 3.7).

## [1.16.1] — 2026-07

### Alterado
- Backup diário: retenção reduzida de 30 para **7 dias**.
- Novo `docs/nvion-backup.md` (arquitetura, pastas por empresa, cron, deploy).

## [1.16.0] — 2026-07

### Adicionado
- **Distribuição round-robin de leads** entre vendedores online: presença por
  heartbeat (`last_seen_at`), trigger `assign_lead_round_robin`, toggles de
  rodízio por vendedor e por empresa em Gestão de Acessos.

## [1.15.0] — 2026-07

### Adicionado
- Linguagem visual estilo TailAdmin (tokens slate/navy, sidebar navy).
- Polimento visual: animações (framer-motion), KPIs animados, shimmer,
  breadcrumb, sparkline e progress ring.

### Corrigido
- Contraste do modo escuro em diversas telas; logos por tema.

## Anteriores

- Módulo de **backup diário** por empresa (Storage privado).
- **Segurança**: política de senha forte + troca obrigatória, RLS multiempresa,
  guarda de privilégio em `profiles`, expurgo de PII do legado, auditoria
  (ver `SECURITY_AUDIT.md`).
- **E-mails** de autenticação e transacionais (Edge Functions + DNS verificado).
- **Gestão de Planos** com dados no banco; correções de super admin.
- Core comercial (leads → oportunidades → vendas) e engine de comissões.
