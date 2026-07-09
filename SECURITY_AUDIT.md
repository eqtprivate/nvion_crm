# Auditoria de Segurança — NVION CRM

**Data:** 2026-07-08 · **Escopo:** repositório `eqtprivate/nvision_crm` (frontend Vite/React), Edge Functions Supabase, migrations SQL, integrações Base44 e Resend.
**Método:** análise estática do código versionado + `npm audit`. A verificação **ao vivo** do banco (policies aplicadas, advisors, storage, config de Auth) **não pôde ser executada** nesta sessão (MCP do Supabase indisponível e egress bloqueado). Itens que dependem do estado real do banco estão marcados como **VERIFICAR MANUALMENTE** com a query/checagem correspondente.

> ⚠️ **Aviso de fonte-da-verdade:** as migrations do repo **não refletem 100%** o banco. As tabelas `profiles` e `user_modules` têm `enable row level security` mas **nenhuma policy nas migrations** — ainda assim o app lê o perfil em produção, logo as policies existem **apenas no banco**. Há *drift* repo↔DB; várias conclusões abaixo precisam ser confirmadas no Supabase real.

---

## 1. Sumário executivo

| Severidade | Qtd |
|---|---|
| CRÍTICO | 1 (a verificar) |
| ALTO | 4 |
| MÉDIO | 6 |
| BAIXO | 3 |
| INFO | 4 |

**Top 5 riscos:**
1. **[A-01] Escalonamento de privilégio via `profiles.role`** — não há policy de UPDATE de `profiles` no repo; é preciso confirmar no banco que um usuário autenticado **não** consegue alterar o próprio `role` (ex.: para `super_admin`) com a chave anon. Se conseguir, é CRÍTICO.
2. **[A-02] Dependências vulneráveis** — `npm audit`: **21 vulnerabilidades (1 crítica, 10 altas, 9 moderadas, 1 baixa)**, incluindo `jspdf` (crítica), `DOMPurify` (várias altas de XSS) e `react-router` (XSS via open redirect).
3. **[A-03] Edge Functions de e-mail com verificação *fail-open*** — `send-email` e `auth-email-hook` só validam o segredo **se a env estiver setada**; sem o segredo, aceitam qualquer chamada → risco de *open relay* e escrita de logs.
4. **[A-04] Hardening de Auth do Supabase não confirmado** — proteção contra senha vazada, expiração de OTP, confirmação de e-mail e advisors de segurança precisam ser validados no painel.
5. **[M-01] Controle de acesso intra-empresa apenas no cliente** — a RLS isola por `empresa_id`, mas a restrição "vendedor vê só o que é seu" é feita em JS (`applyAccessFilter`); um usuário pode ler **todos os dados da própria empresa** via chamada direta à API.

**Pontos fortes observados:** nenhuma `service_role`/API key hardcoded no frontend (só a `publishable`); nenhuma policy `USING(true)`; as 24 tabelas de negócio têm RLS e policies com escopo `empresa_id`; Edge functions administrativas verificam JWT + papel + tenant; sem `re_`/`sk_`/JWT vazados no histórico do git.

---

## 1.1 Atualização pós-validação (2026-07-08)

Verificação ao vivo do banco (via SQL colado pelo usuário) + correções de código aplicadas (v1.11.0).

| Achado | Estado atual |
|--------|--------------|
| **A-01** Escalonamento via `profiles` | **RESOLVIDO / não explorável.** A policy `profiles update by admin` usa `USING can_manage_user(id)` e `WITH CHECK can_manage_profile_values(empresa_id, role)`. As funções (SECURITY DEFINER, search_path fixo) só liberam super_admin ou admin_empresa dentro da própria empresa, **bloqueando `role='super_admin'`**. Usuário comum **não consegue atualizar `profiles`** — logo não há auto-promoção. Trigger `enforce_profile_privilege_rules` adicionado como defesa redundante. *(Efeito colateral funcional: vendedor não edita o próprio nome/foto — bug a tratar, não segurança.)* |
| **A-02** Dependências | **CORRIGIDO.** `npm audit fix` + remoção do `react-quill` não usado → **0 vulnerabilidades** (era 21, incl. jspdf crítica). |
| **A-03** E-mail fail-open | **CORRIGIDO (código).** `send-email` e `auth-email-hook` agora *fail-closed* (segredo obrigatório). Requer re-deploy das functions. |
| **B-01** iframe preview | **CORRIGIDO.** `sandbox=""` adicionado. |
| **M-07** *(novo)* Grants amplos ao `anon` | **CONFIRMADO.** O role `anon` tem ALL (incl. TRUNCATE) em todas as tabelas. Não explorável hoje (RLS `to authenticated` barra o anon; PostgREST não expõe TRUNCATE), mas viola menor-privilégio. **Correção:** `revoke all on all tables in schema public from anon;` (o app exige login; anon não precisa de acesso). |
| **A-04** Auth hardening | **PENDENTE (painel):** confirmar leaked-password protection, confirmação de e-mail, OTP, Advisors sem ERROR. |
| **M-05** DNS/e-mail (nvion.com.br) | **DIAGNOSTICADO.** DNS atual bloqueia envio: SPF `v=spf1 -all` (nega tudo), **sem DKIM**, DMARC `p=reject`. Envio pela **raiz**: trocar SPF para `v=spf1 include:amazonses.com -all`, adicionar DKIM `resend._domainkey` (valor do Resend) e MX/SPF de return-path em `send.nvion.com.br`. DMARC `p=reject` mantém-se (passa por alinhamento DKIM). `EMAIL_FROM=nao-responda@nvion.com.br`. |
| **2b / 2c** RLS e search_path | **A confirmar:** consultas de "tabelas sem RLS" e "funções SECURITY DEFINER sem search_path" ainda não retornadas (esperado: nenhuma linha). |
| **M-02** Connectors OAuth (Base44) | **OK / não aplicável.** 0 de 62 connectors conectados — nenhum escopo OAuth concedido. |
| **M-03** PII legada no Base44 | **MITIGADO (parcial).** PII/segredos redigidos via MCP (`$unset`) nas 4 entities sensíveis: Contact (4), Vendedores (10), Lead (14), UsuarioAcesso (16) — removidos nome, CPF/CNPJ, e-mail, telefone. **Restam as "cascas" (linhas vazias) + entities 🟡 (Account, Opportunity, Vendas, Comissoes, ConciliacaoVenda, Empresa)** para excluir pelo painel do Base44 (não há delete via MCP; SDK no sandbox sem credencial). Rever `requiresAuth:false` do base44Client. |
| **A-05** *(novo, CRÍTICO — legado)* Senha em texto no Base44 | **MITIGADO.** O entity `UsuarioAcesso` (Base44, legado) armazenava **senha temporária em texto puro** (`senha_temporaria`) e `senha_hash`. Removidos agora via `$unset`. O sistema atual (Supabase Auth) **não** tem esse problema — era resíduo do modelo antigo. Confirmar que nenhuma tela grava senha nessa entity novamente. |
| **M-01** Isolamento por vendedor | **DECISÃO PENDENTE.** RLS isola por empresa; o recorte "vendedor vê só o seu" é client-side (`applyAccessFilter` por `display_name`). Levar à RLS é possível, mas exige helper de identidade e é frágil a renomeações — ver decisão com o time. |

---

## 2. Tabela de achados

| ID | Sev. | Categoria | Evidência (arquivo:linha) | Impacto | Correção |
|----|------|-----------|---------------------------|---------|----------|
| **A-01** | CRÍTICO *(verificar)* | RLS / Escalonamento | `supabase/migrations/20260630190000_create_nvion_auth_core.sql:49` (RLS on, **sem policy no repo**) | Se a policy de UPDATE de `profiles` permitir `id = auth.uid()` sem travar colunas, o usuário muda o próprio `role`/`empresa_id` → vira super_admin e acessa tudo. | Garantir policy de UPDATE que **impeça** alterar `role`, `status`, `empresa_id` pelo próprio usuário (só edge function/service_role). Ver query na §4. |
| **A-02** | ALTO | Dependências | `package.json` / `npm audit` | XSS (DOMPurify, react-router), crítica em `jspdf`, DoS (yaml/flatted). Bundle client afetado. | `npm audit fix`; para `jspdf`/`react-quill` avaliar upgrade major; remover libs não usadas. |
| **A-03** | ALTO | Edge Function / Open relay | `supabase/functions/send-email/index.ts:78-83`, `supabase/functions/auth-email-hook/index.ts` (verificação condicional `if (fnSecret)` / `if (hookSecret)`) | Sem a env de segredo, a função aceita qualquer POST → dispara e-mails via Resend e grava `email_logs`. | Tornar *fail-closed*: se o segredo não estiver configurado, **recusar** (500/401). Nunca aceitar sem verificação. |
| **A-04** | ALTO *(verificar)* | Supabase Auth | painel Supabase (fora do repo) | Sem leaked-password protection / OTP curto / confirmação de e-mail, contas ficam fracas a brute force e credential stuffing. | Ativar "Leaked password protection", expiração de OTP ≤ 1h, exigir confirmação de e-mail; rodar Advisors (Security) e zerar ERRORs. |
| **M-01** | MÉDIO | Controle de acesso | `src/lib/accessControl.js` (`applyAccessFilter`), policies `*_select ... empresa_id = current_empresa_id()` em `supabase/migrations/20260703000000_create_business_entities.sql:344` | RLS isola por empresa, mas não por vendedor/líder. Um `vendedor` pode ler **todos** os leads/vendas da empresa via API direta, ignorando o filtro de tela. | Se o requisito for isolamento por vendedor, mover a regra para RLS (ex.: `vendedor_responsavel = auth_email()` ou tabela de membros de equipe). |
| **M-02** | MÉDIO *(verificar)* | Base44 / Storage | `src/components/forms/BusinessCardScanner.jsx:25`, `src/components/forms/ImportContactsDialog.jsx:35` (`base44.integrations.Core.UploadFile`) | Uploads (cartões de visita, planilhas de contatos com PII) podem gerar **URLs públicas** no storage do Base44. | Confirmar se os arquivos do Base44 são privados; se públicos, migrar para storage privado do Supabase com policy. |
| **M-03** | MÉDIO *(verificar)* | Base44 / dados legados | `base44/entities/*.jsonc` (24 entities com RLS por `empresa_vinculada`) + `src/api/base44Client.js:11` (`requiresAuth: false`) | O app migrou para Supabase, mas as entities do Base44 ainda existem. Se ainda contêm dados e a app Base44 estiver acessível, há uma superfície de dados paralela. | Confirmar que as entities do Base44 não têm mais dados sensíveis / não estão acessíveis; desativar se obsoletas. Revisar `requiresAuth`. |
| **M-04** | MÉDIO | Exposição de credencial | `supabase/functions/admin-create-user/index.ts:180-185`, `admin-reset-temp-password/index.ts:120-125` | A senha temporária é retornada no corpo da resposta e exibida ao admin (fica em logs de rede/histórico). | Enviar a senha por e-mail (fluxo de convite `inviteUserByEmail`) em vez de retornar em texto; ou forçar troca no 1º login. |
| **M-05** | MÉDIO *(verificar)* | E-mail / SPF-DKIM-DMARC | DNS do domínio remetente (fora do repo) | Sem SPF/DKIM/DMARC, os e-mails do Resend caem em spam ou permitem spoofing do domínio. | Verificar o domínio no Resend e publicar SPF, DKIM e DMARC no DNS. |
| **M-06** | MÉDIO | Rate limiting | login (`src/pages/Login.jsx`), Edge Functions | Não há rate limit próprio em login nem nas functions; depende do default do Supabase. | Confirmar limites de Auth no painel; considerar rate limit nas Edge Functions (por IP/JWT). |
| **B-01** | BAIXO | XSS (self) | `src/pages/GestaoEmailTemplates.jsx:277` (`iframe srcDoc={renderPreview(draft.html)}`) | O preview renderiza HTML digitado pelo super_admin sem `sandbox`. Self-XSS (só super_admin). | Adicionar `sandbox=""` ao iframe de preview. |
| **B-02** | BAIXO | Auth hook | `supabase/functions/auth-email-hook/index.ts` (verify_jwt=false por design) | Correto que seja público (é hook), mas depende do segredo estar setado (ver A-03). | Cobrir com A-03 (fail-closed). |
| **B-03** | BAIXO | Config | `supabase/functions/*/index.ts` (`Access-Control-Allow-Origin: *`) | CORS `*` nas functions admin. Aceitável (exigem Bearer, sem cookies), mas amplo. | Opcional: restringir a origem ao domínio do app. |
| **INFO-01** | INFO | Chave pública | `src/lib/supabaseClient.js:4` (`sb_publishable_...` fallback hardcoded) | Chave publishable/anon é pública por design — **não** é vazamento. | Nenhuma ação; manter só a anon no cliente. |
| **INFO-02** | INFO | Logs | `src/pages/GestaoAcessos.jsx:439,537`, `Profile.jsx` etc. | `console.error` registra mensagens de erro, sem tokens/PII/senha. | Sem ação; opcional silenciar em prod. |
| **INFO-03** | INFO | XSS (config) | `src/components/ui/chart.jsx:61` (`dangerouslySetInnerHTML`) | Boilerplate shadcn injeta CSS a partir de config (não input de usuário). | Sem ação. |
| **INFO-04** | INFO | Segredos no histórico | `git log`/`git grep` no histórico | Nenhuma `service_role`, `re_`, `sk_` ou JWT encontrada no histórico. | Sem ação. |

---

## 3. Detalhe por fase

### Fase 0 — Inventário
- **Stack:** Vite + React 18 (`.jsx`, 125 arquivos), Supabase (`@supabase/supabase-js`) como backend/DB, 4 Edge Functions (Deno/TS), 8 migrations SQL, Base44 SDK para upload/IA/logs, Resend para e-mail.
- **Segredos:** `.env` **não** versionado (só `.env.example` com placeholders); `.gitignore` cobre `.env*`. Config do cliente em `src/lib/supabaseClient.js` (anon key). Segredos server-side em envs das Edge Functions (`RESEND_API_KEY`, `SEND_EMAIL_FN_SECRET`, `SEND_EMAIL_HOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`).
- **Conexões:** Supabase via anon key no front; Resend só dentro das functions; Base44 via `base44Client.js`.

### Fase 1 — Exposição de segredos ✅
Sem chaves privadas hardcoded no frontend/bundle nem no histórico. Só a `publishable` key (pública por design). `console.*` sem dados sensíveis.

### Fase 2 — Supabase / RLS
- **Positivo:** 24 tabelas de negócio com RLS + policies escopadas por `empresa_id` (via `current_empresa_id()`), `to authenticated` (anon sem acesso). Nenhuma `USING(true)`. Funções auxiliares com `security definer` + `set search_path=public` (migration `20260707010000`). Trigger `enforce_empresa_update_rules` protege `empresas`.
- **A confirmar (drift):** policies de `profiles`, `user_modules`, storage, views e advisors — **não presentes no repo** (ver §4).

### Fase 3 — Base44
- SDK ainda usado para `UploadFile`, `ExtractDataFromUploadedFile`, `appLogs`, `auth.me` (M-02/M-03). Entities legadas com RLS por `empresa_vinculada`. `requiresAuth: false` no client — verificar implicação.

### Fase 4 — Resend / e-mail
- API key só server-side ✅. **Sem injeção de cabeçalho** (Resend usa API JSON, não SMTP raw). Destinatário do transacional é resolvido da tabela `vendedores` (não arbitrário) ✅. Risco em A-03 (fail-open) e M-05 (DNS).

### Fase 5 — Web / app
- **XSS:** só o preview em iframe (B-01) e o boilerplate de chart (INFO-03). Sem `eval`/`innerHTML` de input do usuário.
- **IDOR/intra-tenant:** M-01.
- **Dependências:** A-02.
- **CORS:** B-03.

---

## 4. Verificações manuais no Supabase (SQL)

Rode no SQL Editor e reporte:

```sql
-- (A-01) Policies reais de profiles e user_modules
select tablename, policyname, cmd, qual, with_check
from pg_policies where schemaname='public' and tablename in ('profiles','user_modules');

-- Tabelas SEM RLS (deveria voltar vazio)
select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relrowsecurity=false;

-- Funções SECURITY DEFINER sem search_path fixo
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef and not exists (
  select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%');

-- Grants para anon (deveria ser mínimo)
select table_name, privilege_type from information_schema.role_table_grants
where grantee='anon' and table_schema='public';
```
Também: **Database → Advisors (Security e Performance)** e **Storage → buckets** (algum `public`? policies?).

---

## 5. Plano de remediação priorizado

**Agora (bloqueia produção):**
1. **A-01** — confirmar/consertar policy de UPDATE de `profiles` para impedir auto-promoção de `role`/`empresa_id`.
2. **A-03** — tornar `send-email` e `auth-email-hook` *fail-closed* (recusar sem segredo).
3. **A-04** — ligar leaked-password protection, confirmação de e-mail e rodar Advisors (zerar ERROR).

**Curto prazo:**
4. **A-02** — `npm audit fix` + upgrades de `jspdf`/`react-router`/`DOMPurify`.
5. **M-04** — parar de retornar senha temporária; enviar por e-mail.
6. **M-05** — SPF/DKIM/DMARC do domínio no Resend.
7. **M-01** — decidir e (se preciso) mover isolamento por vendedor para RLS.

**Médio prazo:**
8. **M-02 / M-03** — auditar storage/entidades do Base44 (privacidade de uploads e dados legados).
9. **M-06 / B-01 / B-03** — rate limiting, `sandbox` no iframe de preview, restringir CORS.

---

## 6. Ressalvas

Este relatório é baseado em **análise estática do repositório**. As conclusões marcadas *(verificar)* dependem do estado real do banco/painel Supabase, do DNS e da configuração do Base44, que não puderam ser inspecionados nesta sessão. Nenhum achado foi inventado: onde não houve confirmação, está explicitado o que checar e como.
