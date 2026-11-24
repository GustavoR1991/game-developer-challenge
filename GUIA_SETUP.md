# Guia de setup — Pirate Battle

Passo a passo para preparar o ambiente e a estrutura de pastas do desafio, com base no `README.md`.
Todos os comandos são para **PowerShell**, rodando na raiz do repositório
(`E:\projetos\junglegaming\game-developer-challenge`).

---

## Parte 1 — Ferramentas na máquina

Verificado na sua máquina em 24/11/2026:

| Ferramenta                   | Necessária?                            | Situação            |
| ---------------------------- | --------------------------------------- | --------------------- |
| Node.js (LTS ≥ 20)          | Sim                                     | ✅ v24.15.0 instalado |
| npm (vem com o Node)         | Sim (gerenciador de pacotes + lockfile) | ✅ v11.12.1 instalado |
| Git                          | Sim                                     | ✅ 2.54 instalado     |
| VS Code (ou outro editor)    | Recomendado                             | —                    |
| Conta na Vercel + Vercel CLI | Sim (deploy é obrigatório)            | instalar no passo 1.2 |

### 1.1 Conferir versões

```powershell
node -v; npm -v; git --version
```

Se faltar algo:

- Node: https://nodejs.org (baixe a versão LTS — o npm já vem junto).

### 1.2 Vercel CLI (para o deploy)

```powershell
npm install -g vercel
```

Crie a conta em https://vercel.com (pode entrar com o GitHub).

### 1.3 Extensões recomendadas no VS Code

- ESLint
- Prettier
- Playwright Test for VSCode
- Error Lens (opcional)

---

## Parte 2 — Criar o projeto (Vite + React + TypeScript)

O README deixa a ferramenta de build livre; **Vite** é a escolha mais simples para React + PixiJS.

### 2.1 Gerar o projeto dentro do repositório existente

```powershell
npm create vite@latest . -- --template react-ts
```

Quando ele perguntar sobre a pasta não estar vazia, escolha **"Ignore files and continue"**
(não escolha "Remove existing files", senão os assets e o README somem).

> O Vite vai sobrescrever o `README.md` e o `.gitignore`. Antes de rodar, faça uma cópia:
>
> ```powershell
> Copy-Item README.md README_DESAFIO.md
> ```
>
> Depois do comando, confira o `.gitignore` e mantenha as linhas `node_modules/`, `dist/`, `.env`, etc.

### 2.2 Instalar as dependências base

```powershell
npm install
```

### 2.3 Mover os assets para a pasta pública

O Vite serve tudo que está em `public/` na raiz do site. Mova os assets para lá (com `git mv`, mantendo o histórico):

```powershell
New-Item -ItemType Directory -Force public
```

```powershell
git mv assets public/assets
```

Depois disso os arquivos ficam acessíveis em URLs como `/assets/png/default/ships/...`.

---

## Parte 3 — Instalar as bibliotecas obrigatórias

Stack exigida pelo README (seção 1): React, TypeScript estrito, PixiJS, TanStack Query, Axios, MSW e Playwright.

### 3.1 Dependências de runtime

```powershell
npm install pixi.js @tanstack/react-query axios
```

### 3.2 Dependências de desenvolvimento

```powershell
npm install -D msw @playwright/test @tanstack/react-query-devtools @tanstack/eslint-plugin-query prettier
```

### 3.3 Opcionais úteis (a critério seu)

| Pacote               | Para quê                                                                |
| -------------------- | ------------------------------------------------------------------------ |
| `zod`              | Validar contratos da API e o formulário de Options                      |
| `react-router-dom` | Navegação entre telas (ou faça com um estado simples de "tela atual") |
| `@pixi/sound`      | Tocar os `.wav` de `assets/sounds`                                   |

```powershell
npm install zod @pixi/sound
```

### 3.4 Inicializar o MSW (service worker)

Gera o arquivo `public/mockServiceWorker.js`, necessário para os mocks rodarem no navegador
**inclusive no build publicado** (exigência da seção 6):

```powershell
npx msw init public --save
```

### 3.5 Inicializar o Playwright

```powershell
npm init playwright@latest
```

Respostas sugeridas: TypeScript · pasta `tests/e2e` · **não** adicionar GitHub Actions (por enquanto) · **sim** instalar os browsers.
Se quiser só o Chromium (o README exige Chromium desktop e mobile):

```powershell
npx playwright install chromium
```

---

## Parte 4 — Configurações

### 4.1 TypeScript em modo estrito

O template do Vite já vem com `"strict": true` em `tsconfig.app.json`. Recomendo adicionar também:

```json
"noUncheckedIndexedAccess": true,
"noImplicitOverride": true,
"exactOptionalPropertyTypes": true
```

### 4.2 Scripts no `package.json`

O README (seção 11) exige comandos para dev, build, preview, lint, typecheck e Playwright:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "typecheck": "tsc -b --noEmit",
  "format": "prettier --write .",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:update": "playwright test --update-snapshots",
  "test:e2e:report": "playwright show-report"
}
```

### 4.3 `playwright.config.ts` (pontos importantes)

- `webServer`: rodar `npm run build && npm run preview` (testa o build real).
- `projects`: um **Desktop Chrome** e um **Pixel 7** (ou outro mobile Chromium).
- `reporter: [['html']]` e `use: { trace: 'retain-on-failure' }` (relatório HTML + traces de falha, seção 8).

### 4.4 Arquivo de exemplo de variáveis de ambiente

```powershell
New-Item -ItemType File .env.example
```

Exemplo de conteúdo: `VITE_API_BASE_URL=/api` e `VITE_ENABLE_TEST_HOOKS=false`.

### 4.5 `vercel.json` (SPA)

Para o refresh funcionar em qualquer rota no deploy:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## Parte 5 — Criar a estrutura de pastas

Sugestão de organização que atende à separação pedida na seção 4
(regras do jogo × renderização × input × estado da UI) e às seções 5, 6 e 8:

```
src/
  app/                 # App.tsx, providers (QueryClient), roteamento entre telas
  ui/
    screens/           # MainMenu, Options, Game, Result
    components/        # Botões, abas, diálogos, HUD semântico, controles de toque
    styles/
  game/
    config/            # Configuração tipada de gameplay (balanceamento)
    core/              # Loop baseado em tempo, relógio, pausa, RNG com seed
    entities/          # Player, Chaser, Shooter, Projectile, Island
    systems/           # Movimento, colisão, combate, spawn, IA dos inimigos
    render/            # Tudo que usa PixiJS: sprites, barras de vida, efeitos
    input/             # Teclado e toque -> comandos
    assets/            # Loader de texturas, manifest, tratamento de falhas
    bridge/            # Sincronização jogo -> React (sem render a cada frame)
  api/
    contracts/         # Tipos de Ranking e Match History
    client/            # Instância do Axios
    queries/           # Hooks do TanStack Query (queries e mutations)
  mocks/
    handlers/          # Handlers MSW de ranking e histórico
    fixtures/          # Jogadores e partidas fictícias
    scenarios/         # Cenários de rede (lento, erro, timeout, fora de ordem...)
  storage/             # Persistência local (options, último resultado, pendentes)
  utils/
tests/
  e2e/                 # Specs do Playwright
  fixtures/            # Helpers de teste, seeds, controle do relógio
docs/
  profiling/           # Evidências de performance (seção 9)
```

### 5.1 Comando para criar todas as pastas de uma vez

```powershell
$pastas = @(
  'src/app', 'src/ui/screens', 'src/ui/components', 'src/ui/styles',
  'src/game/config', 'src/game/core', 'src/game/entities', 'src/game/systems',
  'src/game/render', 'src/game/input', 'src/game/assets', 'src/game/bridge',
  'src/api/contracts', 'src/api/client', 'src/api/queries',
  'src/mocks/handlers', 'src/mocks/fixtures', 'src/mocks/scenarios',
  'src/storage', 'src/utils',
  'tests/e2e', 'tests/fixtures',
  'docs/profiling'
)
foreach ($p in $pastas) { New-Item -ItemType Directory -Force $p | Out-Null }
```

### 5.2 Arquivos de documentação exigidos

```powershell
New-Item -ItemType File ARCHITECTURE.md
```

O `README.md` final da solução precisa conter: setup, variáveis de ambiente, controles,
configuração de gameplay, seleção/reset dos cenários de rede, comandos e como reproduzir falhas.

---

## Parte 6 — Testar se está tudo funcionando

```powershell
npm run dev
```

Abra http://localhost:5173 — deve aparecer a página padrão do Vite.

```powershell
npm run typecheck
```

```powershell
npm run lint
```

```powershell
npm run test:e2e
```

---

## Parte 7 — Primeiro commit e deploy

```powershell
git add .
```

```powershell
git commit -m "chore: project setup (vite, react, pixi, tanstack query, axios, msw, playwright)"
```

Deploy (vai pedir login na primeira vez):

```powershell
vercel
```

Para produção:

```powershell
vercel --prod
```

> Lembre-se: o MSW precisa ser iniciado **também em produção** (o worker sobe no `main.tsx`
> antes de renderizar o React), porque a versão publicada precisa executar os mocks de ranking e histórico.

---

## Checklist de entregáveis (seção 11)

- [ ] Código-fonte + `package-lock.json` + assets + mocks + fixtures + testes
- [ ] URL pública funcionando (Vercel)
- [ ] `README.md` da solução (em inglês)
- [ ] `ARCHITECTURE.md` (em inglês)
- [ ] Relatório HTML do Playwright e baselines de regressão visual versionadas
- [ ] Evidências de profiling em `docs/profiling/`
- [ ] Informar a estimativa de prazo **antes de começar**
