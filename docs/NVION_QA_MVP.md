# NVION CRM — Roteiro de QA fim a fim (MVP)

> Objetivo: validar, no ambiente **publicado**, que o fluxo completo funciona por
> papel antes de soltar o MVP. Marque cada item; anote qualquer falha com print +
> passo que a gerou.

Versão alvo: **v1.6.0** • Ambiente: `https://nvion.base44.app`

---

## 0. Pré-condições

- [ ] Migrações aplicadas no Supabase (auditoria + hardening).
- [ ] Build v1.6.0 publicado no Base44 (rodapé do menu mostra "NVION v1.6.0").
- [ ] Advisors de Segurança sem ERROR.
- [ ] Existe ao menos 1 empresa e 1 usuário `admin_empresa` ativo.

---

## 1. Autenticação & Sessão

- [ ] Login com credenciais válidas entra no Painel Geral.
- [ ] Login com senha errada mostra mensagem amigável (não tela branca).
- [ ] "Esqueci minha senha" — *(só quando o e-mail estiver ativo)* — envia link.
- [ ] Logout encerra a sessão e volta ao login.
- [ ] Recarregar a página (F5) mantém a sessão.
- [ ] Trocar de usuário: dados do usuário anterior **não** vazam (cache limpo).

## 2. Controle de acesso (por papel)

Repita o login com cada papel e confirme o menu:

- [ ] **super_admin**: vê tudo, incluindo Gestão de Planos, Empresas, Templates de E-mail, Logs.
- [ ] **admin_empresa**: vê todos os módulos operacionais + Gestão de Acessos + Logs; **não** vê Gestão de Planos.
- [ ] **gestor_comercial / lider_comercial**: vê Comercial + Relatórios; **não** vê Financeiro nem Cadastros administrativos.
- [ ] **gestor_financeiro**: vê Financeiro (Recebíveis, Painel de Recebíveis) + Relatórios.
- [ ] **vendedor**: vê apenas Prospecção, Oportunidades, Clientes, Painel.
- [ ] Acesso direto por URL a uma página fora do papel não expõe dados de outra empresa (RLS).

## 3. Onboarding (admin novo)

- [ ] Banner "Primeiros Passos" aparece no Painel para admin sem cadastros.
- [ ] Página **Boas-vindas** lista os 7 passos e marca os concluídos conforme cadastra.
- [ ] Dispensar o banner persiste (não reaparece ao recarregar).

## 4. Cadastros base (setup inicial)

- [ ] **Administradora**: criar, editar, inativar. CNPJ inválido é aceito com aviso não bloqueante (dados legados).
- [ ] **Produto de Consórcio**: criar vinculado a uma administradora.
- [ ] **Equipe Comercial**: criar com líder responsável.
- [ ] **Vendedor**: criar vinculado a equipe/líder.
- [ ] **Regra de Comissão**: criar com percentuais e parcelas.
- [ ] Campo obrigatório vazio **bloqueia** o salvamento com mensagem clara.

## 5. Fluxo comercial

- [ ] **Lead (Prospecção)**: criar, mover status, editar. Nome obrigatório valida.
- [ ] **Campanha**: criar; data fim < data início é **bloqueada** com mensagem.
- [ ] **Oportunidade**: criar com valor de carta (obrigatório > 0); vincular a cliente/vendedor.
- [ ] **Cliente**: criar; e-mail obrigatório valida.
- [ ] Filtros por vendedor/status funcionam e respeitam o papel (vendedor só vê o que é seu).

## 6. Fluxo financeiro

- [ ] **Venda de Consórcio**: registrar com valor de carta > 0 e comissão prevista.
- [ ] **Comissão**: alterar status (previsto → pago) reflete na lista.
- [ ] **Conciliação Administradora**: importar/associar sem erro.
- [ ] **Recebível**: editar parcela; número de parcela > total é **bloqueado**; marcar não-elegível **exige** motivo.
- [ ] **Painel de Recebíveis**: KPIs, gráficos e filtros carregam; exportar CSV funciona.

## 7. Auditoria

- [ ] Login/logout aparecem em Logs de Auditoria.
- [ ] Criação/edição/exclusão de registros geram entradas com usuário e entidade corretos.
- [ ] Filtros por ação e entidade funcionam; paginação avança/retrocede.
- [ ] admin_empresa vê só logs da própria empresa; super_admin vê todos.

## 8. Robustez / erros

- [ ] Salvar com falha (ex.: sem permissão) mostra **toast** de erro, não falha silenciosa.
- [ ] Erro de renderização cai no Error Boundary (tela "Algo deu errado" com recarregar), não tela branca.
- [ ] Uso em tela pequena (mobile): menu lateral abre/fecha; tabelas rolam sem quebrar o layout.

## 9. Multi-tenant (isolamento)

- [ ] Usuário da Empresa A **não** vê nenhum dado da Empresa B em nenhuma listagem.
- [ ] Ao criar registros, `empresa_vinculada`/`empresa_id` são preenchidos automaticamente.

---

## Critério de aprovação do MVP

Todos os itens de 1–9 marcados **no ambiente publicado**, sem falhas bloqueantes.
Falhas menores (cosméticas) podem virar backlog da Onda 2, desde que registradas.
