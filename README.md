# Tab Manager Lite

Extensão leve para Chrome/Chromium (Manifest V3) para gerenciar abas: buscar, ordenar, fechar e encontrar duplicatas — por site ou por URL completa.

## Funcionalidades (Fase 1)

- Lista de todas as abas abertas, agrupadas por janela.
- Busca por título ou URL.
- Ordenação por título, domínio ou ordem de abertura.
- Seleção múltipla e fechamento em lote ("fechar selecionadas", "fechar outras").
- Duplicatas por **site** (mesmo domínio).
- Duplicatas por **URL completa** (identifica quando a mesma página exata está aberta em mais de uma aba, ex.: o mesmo episódio/anime aberto duas vezes).

## Instalação (modo desenvolvedor)

1. Abra `chrome://extensions`.
2. Ative o "Modo do desenvolvedor" (canto superior direito).
3. Clique em "Carregar sem pacote" e selecione a pasta deste repositório.
4. O ícone da extensão aparecerá na barra de ferramentas — clique para abrir o popup.

## Estrutura

- `manifest.json` — configuração da extensão (MV3).
- `popup.html` / `popup.css` / `popup.js` — interface principal (popup da toolbar).
- `src/tabs.js` — acesso à API `chrome.tabs`.
- `src/duplicates.js` — lógica de agrupamento de duplicatas (site / URL exata).
- `src/actions.js` — fechar/focar abas.
- `src/render.js` — renderização da lista.
- `src/state.js` — estado da UI e preferências persistidas.

Sem build step: é JavaScript puro com módulos ES, carregado diretamente pelo navegador.

## Roadmap (Fase 2)

- Sessões salvas / restauração.
- Suspensão de abas (liberar memória).
- Merge de janelas, mover abas entre janelas.
- Pin/mute de abas.
- Atalhos de teclado.
