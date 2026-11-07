# CLAUDE.md

Multiplayer blackjack: Angular 22 + PixiJS web app, Bun + Hono server, MySQL, WebSockets, Nx monorepo.
README.md has the full feature list, layout and deployment steps; read it first.

## Commands

- `bun install`: install dependencies (Bun is the package manager; Node 22+ is needed for Angular tooling)
- `bun run dev`: server on :3000 and web on :4200 (the dev server proxies `/api` and `/ws`); needs MySQL on :3306
- `bun run validate`: format check, lint, typecheck, tests, knip. Run it before every commit and keep it green.
- `bunx nx build web`: production web build. This is also the type check for all Angular libraries.
- `bun test apps/server`, `bun test libs/shared/blackjack`: the test suites
- `docker compose up -d --build`: full stack (app, MySQL, Adminer) configured from `.env`

## Where things go

- `libs/shared/blackjack`: pure rules (no framework, no I/O). Rule changes go here, with tests.
- `libs/shared/protocol`: REST and WebSocket types. A new client message also needs its zod schema in
  `apps/server/src/realtime/client-message.ts`.
- `apps/server/src/game`: the server-authoritative game. `TableRoom` handles sockets and dispatch, `Betting` handles chips,
  Ready and countdowns, `Seating` handles sit, leave and disconnects, `Round` runs deal → insurance → turns → dealer →
  settle, and `view.ts` projects state into the client snapshot.
- `libs/web/data-access`: services (`AuthStore`, `TableSession`, `LobbyFeed`, `TablesApi`) and guards
- `libs/web/ui`: small reusable presentational components
- `libs/web/table-canvas`: `<blackjack-table>` and its PixiJS scene
- `libs/web/feature-*`: one lazy-loaded library per screen
- Nx tags enforce boundaries: web and server never import each other, and features never import other features.

## Conventions

- Code style: tabs, single quotes, 110 columns (Prettier). ESLint limits are strict: complexity 8,
  40 lines per function, 15 statements, nesting depth 3, 4 parameters, 250 lines per file. Split code instead of
  disabling a rule.
- Keep code simple and readable. Small named functions, a one-line doc comment on anything non-obvious, no
  clever abstractions.
- Angular:
  - Components are standalone, with separate `.ts`, `.html` and `.scss` files (no inline templates or styles).
  - Use `input()`, `output()`, signals, `computed`, `effect` and `@if`/`@for` control flow.
  - Services use `@Service()`, or `@Service({ autoProvided: false })` plus `providers: [...]` when one instance per
    screen is needed. Inject with `inject()`.
  - The app is zoneless and OnPush is the default, so don't add zone.js.
- Forms use Signal Forms (`form()`, `[formField]`, `[formRoot]`, validators in the schema). Don't set `name` on a
  `[formField]` input: Signal Forms sets it, and the compiler errors otherwise. Keep `autocomplete` attributes.
- Styling uses Tailwind + DaisyUI classes in templates. Colors and fonts live only in `apps/web/src/styles/theme.css`.
  Keep component `.scss` short. Avoid component class names that are also DaisyUI components (`title` and
  `status` both caused bugs). Use names like `table-title` or `status-bar`.
- Dialogs use a native `<dialog>` with `showModal()`, not custom overlays.

## Game and realtime rules of thumb

- The server is the only authority. Clients send intents and the server validates them, then broadcasts a full
  `TableView` snapshot. Never send the hidden hole card (face-down cards have `rank`/`suit` null).
- All money moves through the `Wallet` (atomic debit/credit in MySQL). Re-check state after any `await` on the
  wallet, because the phase can change meanwhile (see `Betting.canStillBet`).
- Timers use `Countdown` (one visible countdown per table) and `Waiter` (the round awaits player input). Timing
  comes from `gameConfig` / env vars, never hard-coded.
- Game tests (`table-room.test.ts`) use `StackedShoe` and `MemoryWallet` with zero delays. Add a test for any rule or
  flow change.
- The PixiJS scene never talks to the server. It diffs snapshots: card `id` gives identity, and `seq` gives deal order
  for staggered animations. Layout uses a fixed 1600×900 logical stage (`scene/layout.ts`), letterboxed below a
  `TOP_INSET` reserved for the Angular status bar. Animations use the tiny `Tweener` in `scene/tween.ts`.

## Gotchas

- Bun.SQL: MySQL `DECIMAL` comes back as a string, so wrap it in `Number()`. Run DDL with `sql.unsafe()`.
  MySQL 8 auth needs `DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL=true` (the default) without TLS.
- TypeScript 6: no `baseUrl`. Path aliases in `tsconfig.base.json` are written as `./libs/...`.
- Docker: `STATIC_DIR` must stay relative (`public`), because Hono's `serveStatic` ignores absolute roots. Adminer is
  forced to listen on IPv4 in `docker-compose.yml`.
- knip must stay clean: don't export things that aren't imported elsewhere.

## Verifying UI changes

Build the web app, run the server, and check the change in a real browser. For anything at the table, use two
browser sessions (two users, ideally one at a landscape phone size) and confirm both screens show the same thing.
