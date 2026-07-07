# NVION CRM — Roadmap de Prontidão para MVP

> Objetivo: deixar o sistema **100% funcional e operável** para rodar um MVP com
> empresas reais. Foco em **acesso, permissões, e-mail, logs, segurança e
> qualidade** — não em novos módulos de negócio.

**Legenda de prioridade**
- **P0** — bloqueia o lançamento do MVP (fazer antes de soltar).
- **P1** — logo após o lançamento (primeiras 1–2 semanas).
- **P2** — evolução/robustez contínua.

**Estado auditado em:** 2026-07 · branch `main` · backend Supabase (`ifzxaaptgozudsdvjbbo`).

---

## A. Autenticação & Contas de acesso

**Estado atual**
- Login via Supabase Auth (`signInWithPassword`), com bloqueio por `status != 'ativo'` (`AuthContext.jsx`).
- Recuperação de senha: link "Esqueci minha senha" chama `resetPasswordForEmail` (`Login.jsx`), mas **depende de SMTP** e **não há página dedicada** para definir a nova senha ao voltar do link (hoje cairia no fluxo do Profile).
- Criação de usuário: Edge Function `admin-create-user` gera **senha temporária exibida ao admin** (copiar/colar); reset via `admin-reset-temp-password`. **Nada é enviado por e-mail.**
- Troca de senha logado: `Profile.jsx` (`auth.updateUser`).

**Tarefas**
- [ ] **P0** Criar página dedicada de **redefinição de senha** (`/RedefinirSenha`) que trata o token de recovery do link do e-mail e permite definir nova senha (sem passar pelo Profile).
- [ ] **P0** Definir `redirectTo` do `resetPasswordForEmail` para essa página e cadastrar a URL em **Auth → URL Configuration** no Supabase (Site URL + Redirect URLs).
- [ ] **P0** Corrigir o bug de cache de perfil: chamar `resetDbProfileCache()` no **login e no logout** (`AuthContext`) — hoje nunca é chamado (risco de vazar `empresa_id` entre sessões).
- [ ] **P1** Fluxo de **primeiro acesso**: forçar troca da senha temporária no primeiro login (flag no perfil) em vez de depender do usuário lembrar.
- [ ] **P1** Enviar credenciais por **e-mail** ao criar usuário (ver workstream C), reduzindo o repasse manual da senha temporária.
- [ ] **P2** Remover exibição da senha temporária em tela após envio por e-mail (defesa em profundidade — item herdado do Sprint 7).

**Critério de aceite:** usuário novo recebe acesso e consegue logar e trocar a senha sem intervenção manual; "esqueci minha senha" entrega o link e conclui a redefinição numa tela própria.

---

## B. Controle de Acesso (RBAC + Módulos + RLS)

**Estado atual**
- Papéis em `ROLE_LABELS`; permissões de módulo em `public.user_modules` (por usuário); defaults em `ROLE_MODULE_DEFAULTS`.
- Menu e telas filtram por `modulos_permitidos` + `adminOnly` (`Layout.jsx`, `Settings/CentralTab`).
- RLS por empresa nas 18 tabelas de negócio + empresas/profiles.

**Tarefas**
- [ ] **P0** **Novos módulos x permissões existentes**: admins de empresa criados antes de um módulo novo **não o enxergam** (o `user_modules` gravado não contém o módulo). Definir estratégia: (a) `admin_empresa`/`super_admin` sempre veem todos os módulos independentemente do `user_modules`, ou (b) migração que concede os módulos novos aos perfis admin. Aplicar a `PainelRecebiveis`, `Recebiveis`, `Comissoes`, `ConciliacaoAdministradora`.
- [ ] **P0** **Matriz de permissões** documentada: para cada papel, quais módulos e quais ações (ver/criar/editar/excluir). Validar que a UI e a RLS concordam com a matriz.
- [ ] **P0** **RLS de escrita por papel**: hoje a RLS isola por empresa, mas não distingue ação por papel (ex.: vendedor não deveria excluir regra de comissão). Definir se o MVP exige isso; se sim, políticas específicas ou checagem no `db.js`/telas.
- [ ] **P1** Tela de **gestão de acessos**: revisar edição de módulos por usuário (bulk), e impedir que um admin remova o próprio acesso de administração.
- [ ] **P1** Garantir que `super_admin` cross-empresa e `admin_empresa` restrito à própria empresa estão corretos em todas as telas (auditar `applyAccessFilter` + RLS juntos).
- [ ] **P2** Papéis adicionais/ajuste fino (ex.: somente leitura para auditoria externa).

**Critério de aceite:** cada papel vê e faz exatamente o previsto na matriz; nenhum usuário acessa dados de outra empresa (validado por teste com 2 empresas).

---

## C. E-mail Transacional (envio padrão)

**Estado atual**
- **Nenhum SMTP configurado**; nenhum envio de e-mail no código. Recuperação de senha usaria o e-mail default do Supabase (rate-limited, não recomendado para produção).

**Tarefas**
- [ ] **P0** Provisionar provedor transacional (**Resend / Amazon SES / SendGrid**) e configurar **SMTP customizado no Supabase Auth** (Auth → SMTP Settings).
- [ ] **P0** Personalizar os **templates de Auth** (confirmação, recuperação de senha, convite) com a marca NVION e o domínio correto.
- [ ] **P0** Configurar **domínio de envio** (SPF/DKIM/DMARC) para não cair em spam.
- [ ] **P1** E-mail de **boas-vindas / credenciais** ao criar usuário (Edge Function chama o provedor) — substitui o repasse manual da senha temporária.
- [ ] **P2** E-mails operacionais (opcional MVP): notificação de recebível vencendo, resumo semanal — deixar para depois.

**Critério de aceite:** e-mails de recuperação/convite chegam de forma confiável (não-spam), com a marca correta, a partir do domínio da empresa.

---

## D. Auditoria & Logs

**Estado atual**
- Tabela `public.audit_logs` existe (com RLS), mas **nenhuma escrita** parte do app. Auditoria efetivamente inexistente.

**Tarefas**
- [ ] **P0** Camada de auditoria: helper `logAudit({ acao, entidade, entidade_id, antes, depois })` que grava em `audit_logs` (com `empresa_id`, `user_id`, timestamp). Injetar no `db.js` (create/update/delete) e/ou em ações sensíveis.
- [ ] **P0** Registrar eventos-chave: **login**, criação/edição/remoção de usuário, **mudança de permissões**, criação/cancelamento de venda, confirmação de conciliação, alteração de status de comissão/recebível.
- [ ] **P1** Tela de **visualização de logs** (admin) com filtros por usuário, entidade, período.
- [ ] **P1** Definir **retenção** e política de acesso aos logs (só admin/super_admin).
- [ ] **P2** Exportação de trilha de auditoria (CSV) para compliance.

**Critério de aceite:** toda ação sensível gera um registro rastreável (quem, o quê, quando, empresa); admin consegue auditar.

---

## E. Segurança & Hardening

**Estado atual (advisors do Supabase)**
- **Leaked Password Protection** desligada.
- `search_path` mutável em `set_updated_at`, `current_empresa_id`, `is_super_admin`.
- Funções `SECURITY DEFINER` executáveis por `anon`/`authenticated` (`can_manage_*`, `current_profile_*`, `enforce_empresa_update_rules`, `rls_auto_enable`).

**Tarefas**
- [ ] **P0** Ativar **Leaked Password Protection** (Auth → Password) e política mínima de senha.
- [ ] **P0** Fixar `search_path` das funções (`SET search_path = public`) e revisar as `SECURITY DEFINER` expostas (revogar `EXECUTE` de `anon` onde não fizer sentido).
- [ ] **P0** Rodar `get_advisors` (security + performance) e **zerar os itens de ERROR**; documentar os WARN aceitos.
- [ ] **P0** **Chaves/segredos**: garantir que só a chave *publishable/anon* está no frontend; a `service_role` **nunca** no cliente (usada apenas nas Edge Functions via secret). Conferir `supabaseClient.js`.
- [ ] **P1** Rotacionar chaves se necessário; configurar **CORS** e domínios permitidos.
- [ ] **P1** Rate limiting / proteção de brute force no login (Supabase Auth settings).
- [ ] **P2** Revisão de dependências (npm audit) e headers de segurança no host.

**Critério de aceite:** advisors de segurança sem ERROR; nenhuma chave sensível no bundle; senha vazada bloqueada.

---

## F. Multi-tenant / Isolamento de dados

**Estado atual**
- `empresa_id`/`empresa_vinculada`/`created_by` injetados no create (`db.js`); whitelist de colunas evita erro de coluna desconhecida; RLS por empresa.

**Tarefas**
- [ ] **P0** Corrigir `resetDbProfileCache` no login/logout (também citado em A) — evita `empresa_id` de sessão anterior.
- [ ] **P0** Garantir `empresa_id` **não nulo** em todos os writes de tabelas tenant (hoje cai para `null` se o perfil não tiver empresa) — validar/branquear.
- [ ] **P1** Teste automatizado/manual de **isolamento entre 2 empresas** (nenhuma leitura/edição cruzada).
- [ ] **P2** Índices e performance por `empresa_id` sob volume (já há índices; revisar sob carga real).

**Critério de aceite:** dois usuários de empresas diferentes nunca veem/alteram dados um do outro, validado ponta a ponta.

---

## G. Qualidade de dados & Validação

**Estado atual**
- Schemas Zod não-bloqueantes para campos de qualidade (CPF/CNPJ, telefone, e-mail, CEP); obrigatórios ainda bloqueiam.
- Whitelist de colunas no `db.js` protege o salvamento.

**Tarefas**
- [ ] **P1** Revisar **campos obrigatórios** por entidade conforme regra de negócio (o que é realmente mandatório no MVP).
- [ ] **P1** Padronizar **enums/status** entre entidades e a UI (evitar valores fora do domínio, ex.: import de clientes).
- [ ] **P2** Deduplicação (administradoras, clientes por CPF/CNPJ) e normalização.

**Critério de aceite:** cadastros consistentes; nenhum save quebra por dado divergente; obrigatórios corretos.

---

## H. Tratamento de erros & UX de falhas

**Estado atual**
- Mutations com `onError` em várias telas (toasts); algumas telas sem feedback de erro explícito.

**Tarefas**
- [ ] **P0** Padronizar **feedback de erro** em todas as ações de salvar/excluir (toast com mensagem clara; nunca falha silenciosa).
- [ ] **P0** **Error boundary** global para não quebrar o app inteiro em erro de render.
- [ ] **P1** Estados de **loading/empty** consistentes em todas as telas.
- [ ] **P2** Mensagens amigáveis para erros de RLS/permissão (traduzir erro técnico do Postgres).

**Critério de aceite:** nenhuma ação falha sem o usuário perceber; erro de uma tela não derruba o sistema.

---

## I. Deploy, Ambientes & Versionamento

**Estado atual**
- Frontend hospedado no Base44 (`git_remote_source: s3`); publicação manual via **Publish**. Sync GitHub→Base44 com lag.
- Edge Functions via GitHub Actions (push em `supabase/functions/**`), dependendo de secrets `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_ID`.
- Versão em `version.js` + `package.json`; bump por deploy (política adotada).

**Tarefas**
- [ ] **P0** Confirmar secrets do workflow de Edge Functions configurados no GitHub (senão o deploy de funções falha).
- [ ] **P0** Processo de deploy documentado (push → Publish no Base44 → verificar `NVION vX.Y.Z` no rodapé).
- [ ] **P1** Avaliar **hospedagem própria** (Vercel/Netlify/Cloudflare Pages) com deploy automático da `main` — remove o passo manual e o acoplamento S3 (o app já é SPA Vite + Supabase).
- [ ] **P1** Separar **ambiente de staging** (projeto Supabase de teste) do de produção.
- [ ] **P2** Migrations versionadas aplicadas via CI (hoje aplicadas manualmente).

**Critério de aceite:** deploy reprodutível e rastreável por versão; ninguém publica "no escuro".

---

## J. LGPD & Privacidade

**Tarefas**
- [ ] **P1** Mapear dados pessoais (clientes, vendedores: CPF/CNPJ, e-mail, telefone) e minimizar exposição.
- [ ] **P1** Mascaramento de dados sensíveis em listas/logs quando aplicável.
- [ ] **P2** Política de privacidade/termos e base legal; fluxo de exclusão a pedido.

**Critério de aceite:** dados pessoais protegidos por RLS + mascaramento; base para conformidade LGPD.

---

## K. QA de Aceitação (tela a tela)

**Tarefas**
- [ ] **P0** Roteiro de teste **fim a fim** com usuário real de cada papel: onboarding → cadastros → lead → oportunidade → venda → comissão → conciliação → recebível → painel.
- [ ] **P0** Testar **salvar/editar/excluir** em cada tela no ambiente publicado (não só local).
- [ ] **P1** Checklist de responsividade (mobile) das telas principais.
- [ ] **P2** Testes automatizados dos fluxos críticos.

**Critério de aceite:** todos os fluxos do MVP passam no ambiente publicado, por papel.

---

## L. Observabilidade & Suporte

**Tarefas**
- [ ] **P1** Captura de erros do frontend (ex.: Sentry) para enxergar falhas em produção.
- [ ] **P1** Monitorar logs/erros das Edge Functions e do Supabase.
- [ ] **P2** Canal de suporte/feedback dentro do app.

**Critério de aceite:** falhas em produção são visíveis à equipe sem depender do usuário reportar.

---

## Ondas de execução (sequência sugerida)

**Onda 1 — Lançável (P0) — pré-MVP**
1. E-mail transacional (SMTP + templates) — **C**
2. Redefinição de senha (página + redirect) e fix `resetDbProfileCache` — **A/F**
3. Permissões: admins veem todos os módulos + matriz de permissões — **B**
4. Auditoria mínima (login, usuários, permissões, vendas) — **D**
5. Hardening de segurança (advisors sem ERROR, leaked password, search_path, service_role) — **E**
6. Erros: padronização de feedback + error boundary — **H**
7. QA fim a fim por papel no ambiente publicado — **K**

**Onda 2 — Estabilização (P1) — pós-lançamento**
- Primeiro acesso (troca forçada de senha) e e-mail de credenciais — **A/C**
- Tela de logs + retenção — **D**
- Isolamento validado entre empresas + obrigatórios revisados — **F/G**
- Staging separado + captura de erros (Sentry) — **I/L**
- LGPD (mapeamento + mascaramento) — **J**

**Onda 3 — Evolução (P2)**
- Hospedagem própria com deploy automático — **I**
- Deduplicação/normalização de dados — **G**
- E-mails operacionais, exportações de auditoria, testes automatizados — **C/D/K**

---

## Definição de "pronto para MVP"

O sistema está pronto para soltar quando **todos os P0 estiverem concluídos e validados no ambiente publicado**: usuários entram e recuperam senha por e-mail; cada papel vê só o que deve; ações sensíveis são auditadas; advisors de segurança sem ERROR; nenhum salvamento falha silenciosamente; e o fluxo comercial→financeiro roda ponta a ponta por papel.
