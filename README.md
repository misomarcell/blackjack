# ♠ Blackjack Party

Multiplayer blackjack against a computer dealer. Up to six players per table, everything happens live on
every screen: chips, deals, card flips, turns, payouts and chat.

- **Web:** Angular 22 (zoneless, signals, Signal Forms, `@Service()`), Tailwind CSS 4 + DaisyUI 5, PixiJS 8 for the table
- **Server:** Bun + Hono, WebSockets for realtime, MySQL 8.4 via `Bun.SQL`
- **Monorepo:** Nx, with ESLint, Prettier and knip
- **Deploy:** Docker Compose (app + MySQL + Adminer)

## Features

- Register / sign in with username, e-mail and password (argon2 hashes, httpOnly session cookie)
- Lobby with every table's limits and live player count; each table has a shareable URL (`/table/<id>`).
  Opening a shared link while signed out returns you to that table after signing in.
- Admins (the user named in `ADMIN_USERNAME`) create, edit and delete tables. Deleting a table refunds all bets.
- Admins also get a player list where they can remove players.
- The lobby shows a leaderboard of the richest players.
- Betting: the first player to press **Deal me in** at an idle table starts a 10 s countdown if others are seated
  (alone, the round starts at once). After each round everybody gets 45 s to bet. The round starts early when
  every seated player is ready.
- Full rules: 6-deck shoe with cut card, blackjack pays 3:2, dealer stands on all 17s (configurable), dealer
  peeks under aces and tens, insurance pays 2:1, double on any two cards, split pairs up to four hands
  (double after split allowed, split aces get one card), 20 s turn timer that auto-stands.
- Animated balance that counts up and down, a balance refill once every 24 hours when you go broke (under $5), and table chat (stored in MySQL).
- Desktop first, playable on landscape phones. Keyboard shortcuts at the table: **H**it, **S**tand, **D**ouble, s**P**lit.

## Repository layout

```
apps/
  server/                 Bun + Hono backend
    src/auth/             register, login, JWT cookie sessions
    src/db/               MySQL client, schema migration, repositories
    src/game/             server-authoritative game: seats, betting, round flow, view projection
    src/realtime/         WebSocket routes, lobby feed, live room registry
    src/tables/           table catalog + admin CRUD
    src/wallet/           atomic balance changes, refill
  web/                    Angular shell: bootstrapping, routes, top bar, global theme
    src/styles/theme.css  all colors and fonts (DaisyUI theme "arcade")
libs/
  shared/blackjack/       pure rules engine (hand totals, split/double/insurance rules, settlement, shoe)
  shared/protocol/        REST and WebSocket message types shared by server and web
  web/data-access/        AuthStore, guards, LiveSocket, LobbyFeed, TableSession, TablesApi
  web/ui/                 small reusable components (balance counter, countdown ring, field errors)
  web/table-canvas/       <blackjack-table> component and its PixiJS scene
  web/feature-auth/       login and register pages
  web/feature-lobby/      table catalog
  web/feature-admin/      table and player management
  web/feature-table/      table screen: status bar, bet panel, actions, insurance, chat
```

Nx tags enforce the boundaries: `scope:web` and `scope:server` may only use their own scope plus
`scope:shared`; features may use data-access, ui and util libraries but not other features.

### How a round flows

1. Clients send small intent messages over `/ws/tables/:id` (`sit`, `bet`, `ready`, `action`, `insurance`, `chat`).
2. The server validates them against the game state, moves money through the wallet, and broadcasts a full
   `TableView` snapshot to everyone at the table. The dealer's hole card is never sent until it is revealed.
3. `<blackjack-table>` diffs each snapshot against what it already shows: new cards slide from the shoe in deal
   order (by `seq`) and flip at the end, revealed cards flip in place, cleared cards fly off the table.
4. The server paces the deal so every client has time to play the animations.

## Local development

Requirements: [Bun](https://bun.sh) 1.4+, Node 22+ (for the Angular build tools) and Docker for MySQL.

```bash
bun install
```

```bash
docker run -d --name bj-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=blackjack -e MYSQL_USER=blackjack -e MYSQL_PASSWORD=blackjack mysql:8.4
```

```bash
bun run dev
```

The Angular dev server runs on http://localhost:4200 and proxies `/api` and `/ws` to the Bun server on port 3000.
The server creates the schema on start and seeds three tables. Register a user named `admin` to manage tables.

### Scripts

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `bun run dev`       | web + server with live reload                 |
| `bun run build`     | production builds of all projects             |
| `bun run test`      | rules engine and game-flow tests (`bun test`) |
| `bun run lint`      | ESLint on every project                       |
| `bun run typecheck` | TypeScript checks for server and shared libs  |
| `bun run format`    | Prettier write (`format:check` to verify)     |
| `bun run knip`      | unused files, exports and dependencies        |
| `bun run validate`  | everything above in one go                    |

ESLint limits cyclomatic complexity (8), function length (40 lines), statements (15), nesting depth (3),
parameters (4) and file length (250 lines). Prettier uses tabs and single quotes.

## Deploying with Docker (Ubuntu server)

1. Install Docker Engine with the Compose plugin and copy this repository to the server.
2. Create the config and change every secret:

    ```bash
    cp .env.example .env
    ```

    ```bash
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env
    ```

    Then edit `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` and `ADMIN_USERNAME` in `.env`
    (use URL-safe passwords: letters, digits, `-` and `_`).

3. Build and start:

    ```bash
    docker compose up -d --build
    ```

4. Open `http://<server>:3000`, register the admin user, and share table links with your friends.

Update to a new version with `git pull` followed by `docker compose up -d --build`. The database lives in the
`db-data` volume and survives rebuilds.

### Adminer (web database manager)

Adminer runs at port `8080`, bound to `127.0.0.1` by default so it is not exposed to the internet. Reach it with
an SSH tunnel (`ssh -L 8080:localhost:8080 you@server`, then http://localhost:8080) or set `ADMINER_BIND=0.0.0.0`
in `.env`. Sign in with server `db`, user `MYSQL_USER` and password `MYSQL_PASSWORD`.

### HTTPS

Put a reverse proxy (Caddy, nginx, Traefik) in front of port 3000 and set `COOKIE_SECURE=true`. The proxy must
forward WebSocket upgrades for `/ws/*`.

### Configuration

| Variable                              | Default        | Meaning                                                       |
| ------------------------------------- | -------------- | ------------------------------------------------------------- |
| `APP_PORT`                            | `3000`         | host port of the app                                          |
| `JWT_SECRET`                          | required       | signs session cookies                                         |
| `ADMIN_USERNAME`                      | `admin`        | registering with this name grants admin rights                |
| `STARTING_BALANCE`                    | `1000`         | dollars for new players and for refills                       |
| `REFILL_COOLDOWN_HOURS`               | `24`           | hours a player waits between two free refills                 |
| `COOKIE_SECURE`                       | `false`        | send cookies only over HTTPS                                  |
| `FIRST_BET_SECONDS`                   | `10`           | countdown after the first Ready at an idle table              |
| `BETTING_SECONDS`                     | `45`           | betting window after each round                               |
| `INSURANCE_SECONDS`                   | `10`           | time to decide on insurance                                   |
| `TURN_SECONDS`                        | `20`           | time per decision before auto-stand                           |
| `DEALER_HITS_SOFT_17`                 | `false`        | H17 instead of S17                                            |
| `DECKS`                               | `6`            | decks in the shoe                                             |
| `MYSQL_*`                             | see example    | database name, user and passwords                             |
| `ADMINER_PORT` / `ADMINER_BIND`       | `8080` / local | where Adminer listens                                         |
| `DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL` | `true`         | MySQL 8 auth without TLS; fine on the private Compose network |
