# Tab Manager Lite

Extensão leve para Chrome/Chromium (Manifest V3) para gerenciar abas: buscar, ordenar, fechar e encontrar duplicatas — por site ou por URL completa.

## Funcionalidades

### Fase 1

- Lista de todas as abas abertas, agrupadas por janela.
- Busca por título ou URL.
- Ordenação por título, domínio ou ordem de abertura.
- Seleção múltipla e fechamento em lote ("fechar selecionadas", "fechar outras").
- Duplicatas por **site** (mesmo domínio).
- Duplicatas por **URL completa** (identifica quando a mesma página exata está aberta em mais de uma aba, ex.: o mesmo episódio/anime aberto duas vezes).
- Contador do total de abas abertas no ícone da extensão.

### Fase 2

- Sessões: salvar as abas da janela atual com um nome e restaurá-las depois (aba "Sessões").
- Pin/unpin e mute/unmute por aba, direto na lista.
- Suspender aba (💤) para liberar memória sem fechá-la.
- Mesclar todas as janelas na janela atual (botão ⧉ na barra superior).
- Atalho de teclado (`Ctrl+Shift+D` por padrão, configurável em `chrome://extensions/shortcuts`) para fechar automaticamente as duplicatas de URL idêntica, mantendo a mais recente.

## Instalação (modo desenvolvedor)

1. Abra `chrome://extensions`.
2. Ative o "Modo do desenvolvedor" (canto superior direito).
3. Clique em "Carregar sem pacote" e selecione a pasta deste repositório.
4. O ícone da extensão aparecerá na barra de ferramentas — clique para abrir o popup.

## Estrutura

- `manifest.json` — configuração da extensão (MV3).
- `popup.html` / `popup.css` / `popup.js` — interface principal (popup da toolbar).
- `background.js` — service worker: badge com total de abas e atalho de teclado.
- `src/tabs.js` — acesso à API `chrome.tabs`.
- `src/duplicates.js` — agrupamento de duplicatas (site / URL exata) e seleção de fechamento automático.
- `src/actions.js` — fechar/focar/pin/mute/suspender abas.
- `src/windows.js` — mesclar janelas e mover abas entre janelas.
- `src/sessions.js` — salvar/listar/excluir/restaurar sessões (`chrome.storage.local`).
- `src/render.js` — renderização da lista e das sessões.
- `src/state.js` — estado da UI e preferências persistidas.

Sem build step: é JavaScript puro com módulos ES, carregado diretamente pelo navegador.

## Testes

Usa o test runner nativo do Node (`node:test`, zero dependências) com um mock leve de `chrome.*` em `src/test-helpers/chromeMock.js`.

```bash
npm test              # roda a suíte
npm run test:coverage # roda com relatório de cobertura
```

Cobre a lógica pura e as integrações com `chrome.storage`/`chrome.tabs` (sessions, duplicatas, ações, merge de janelas). A camada de UI (`popup.js`, `render.js` no DOM, `background.js`) não tem testes automatizados — é validada manualmente carregando a extensão no Chrome.
