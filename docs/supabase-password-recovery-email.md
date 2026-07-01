# Recuperacao de senha por email transacional

O NVION usa Supabase Auth para enviar emails de recuperacao de senha. O codigo chama `resetPasswordForEmail` em:

- `src/pages/Login.jsx`
- `src/pages/GestaoAcessos.jsx`

## Variavel de ambiente do app

Configure a URL publica do app no ambiente de build:

```env
VITE_PUBLIC_APP_URL=https://seu-dominio-do-nvion.com
```

O link de recuperacao sera redirecionado para:

```text
https://seu-dominio-do-nvion.com/Profile
```

Se `VITE_PUBLIC_APP_URL` nao estiver definida, o app usa `window.location.origin`.

## Configuracao no Supabase

No Supabase Dashboard do projeto:

1. Acesse `Authentication > URL Configuration`.
2. Configure `Site URL` com o mesmo dominio de `VITE_PUBLIC_APP_URL`.
3. Adicione em `Redirect URLs`:

```text
https://seu-dominio-do-nvion.com/Profile
```

4. Acesse `Authentication > Email Templates`.
5. Revise o template `Reset Password`.
6. Acesse `Project Settings > Authentication > SMTP Settings`.
7. Configure o provedor transacional, por exemplo Resend, SendGrid, Postmark, Mailgun ou Amazon SES.
8. Use um remetente verificado no provedor, por exemplo:

```text
NVION <no-reply@seudominio.com>
```

## Checklist de teste

1. Publicar o app com `VITE_PUBLIC_APP_URL`.
2. Abrir a tela de login.
3. Clicar em `Esqueci minha senha`.
4. Informar um email existente no Supabase Auth.
5. Confirmar recebimento do email transacional.
6. Abrir o link e validar que o usuario chega autenticado ao `/Profile`.
7. Alterar a senha em `Meu Perfil > Alterar Senha`.

## Observacoes

- As credenciais SMTP nao devem ser versionadas no Git.
- O envio do email e feito pelo Supabase Auth, nao por Edge Function do NVION.
- A funcao de senha temporaria administrativa e separada do fluxo de recuperacao por email.
