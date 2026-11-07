# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Groups of friends who share a table link and play blackjack together for fun, often while chatting at the table
or talking on a call. Skill is mixed: some players know the rules well, and many are casual players who need
split, double and insurance to be obvious when they come up. One user per group (the admin) also creates and
manages tables.

## Product Purpose

Blackjack Party lets up to six friends sit at the same live table against a computer dealer and see every chip,
deal, card flip, turn and payout happen at the same moment on every screen. Success means a group can open a
shared link, sign in, sit down and play a round together without anyone having to explain the interface, and
want to keep playing.

## Positioning

A social table first, a casino second: the point is playing together with people you know, through a shared
link, with chat and simultaneous animations, not grinding hands alone against a house.

## Operating Context

- Entry is usually a shared table URL (`/table/<id>`); signing in from it returns the player to that table.
- Flow: lobby (table limits, live player count) → sit → bet and press **Deal me in** → countdown → deal →
  insurance → turns (20 s auto-stand timer) → dealer → settle → 45 s betting window for the next round.
- Desktop first, also playable on landscape phones. Keyboard shortcuts at the table: H, S, D, P.
- Table chat and a persistent table log sit beside the game.
- Admin screen for creating, editing and deleting tables.

## Capabilities and Constraints

- Full rules: 6-deck shoe with cut card, blackjack pays 3:2, dealer stands on all 17s (configurable), dealer
  peeks, insurance pays 2:1, double on any two cards, split up to four hands, split aces get one card.
- The server is the only authority; clients only show what the server's snapshot says, and the hole card is
  never revealed early.
- Chips are play money with a free refill when a player goes broke. Purchases or rewards may be added later
  (undecided); nothing in the product may imply real-money gambling today.
- Table music and sound effects play from audio files in `apps/web/public/audio`.

## Brand Commitments

- Name: **Blackjack Party** (♠ mark in the README).
- The user's binding direction: friendly and playful, with bright colors, while staying easy to use and
  understand. Playfulness never comes at the cost of reading the game state.

## Evidence on Hand

- Real features and rules as listed in `README.md`.
- Audio assets in `apps/web/public/audio/music` and `apps/web/public/audio/sfx`.
- No testimonials, player counts, ratings or press exist. Don't make any up.

## Product Principles

1. **Everyone sees the same table.** Shared moments (deals, flips, payouts) are the product; they must read the
   same on every screen and at every size.
2. **The game state is always readable.** Whose turn it is, what each hand totals, what you bet and how much
   time is left are clear at a glance, before any decoration.
3. **Teach in place.** Casual players learn split, double and insurance from what the table offers at the
   moment, not from a rules page.
4. **Fun, not pressure.** Play money, friendly tone, free refills. Avoid casino tricks that push people to bet
   more.
5. **Get to the table fast.** From a shared link to a seat takes as few steps as possible.

## Accessibility & Inclusion

Timers and turn changes must not rely on color or sound alone, and every table action stays reachable by
keyboard. No formal standard has been set yet (undecided).
