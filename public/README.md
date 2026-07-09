# Assets públicos (logos/ícones)

Coloque **os dois arquivos** de logo aqui, com **estes nomes exatos** — o app
referencia por caminho fixo (`/nvion-icon.png` e `/nvion-icon-dark.png`), então
basta substituir os arquivos para atualizar a marca em todo o sistema.

| Arquivo | Uso | Recomendação |
|---------|-----|--------------|
| `nvion-icon.png` | Fundo **claro** (tema claro, favicon) | Logo/ícone colorido ou escuro, PNG com fundo transparente |
| `nvion-icon-dark.png` | Fundo **escuro** (tema escuro, tela de login) | Versão branca/clara, PNG com fundo transparente |

Onde aparecem:
- Sidebar (troca automática conforme o tema)
- Favicon da aba (`nvion-icon.png`)
- Tela de login (`nvion-icon-dark.png`, pois o fundo é escuro)

Dica: use PNG quadrado (ex.: 512×512) com fundo transparente. O app ajusta o
tamanho por CSS.
