---
name: Blackjack Party
description: Multiplayer blackjack for friends, built as a bright, chunky game-night arcade.
colors:
    sunset-orange: 'oklch(64% 0.18 48)'
    pool-blue: 'oklch(72% 0.17 230)'
    lemon-pop: 'oklch(86% 0.18 95)'
    night-ink: 'oklch(30% 0.08 280)'
    ink-text: 'oklch(25% 0.06 280)'
    cream-paper: 'oklch(98% 0.02 95)'
    warm-sand: 'oklch(94% 0.04 95)'
    toasted-sand: 'oklch(88% 0.06 95)'
    sky-info: 'oklch(74% 0.15 220)'
    hit-green: 'oklch(74% 0.2 150)'
    marigold-warning: 'oklch(80% 0.17 70)'
    stand-red: 'oklch(65% 0.24 25)'
    grape-chip: 'oklch(60% 0.22 295)'
    felt-green: '#1fa37a'
    felt-shadow: '#137a5b'
    felt-print: '#9ff0cf'
    rail-orange: '#df6100'
    card-cream: '#fff8e6'
typography:
    display:
        fontFamily: 'Lilita One, system-ui, sans-serif'
        fontSize: '3rem'
        fontWeight: 400
        lineHeight: 1
        letterSpacing: '0.025em'
    headline:
        fontFamily: 'Lilita One, system-ui, sans-serif'
        fontSize: '1.5rem'
        fontWeight: 400
        lineHeight: 1.2
        letterSpacing: '0.025em'
    title:
        fontFamily: 'Lilita One, system-ui, sans-serif'
        fontSize: '1.1rem'
        fontWeight: 400
        lineHeight: 1.2
        letterSpacing: '0.02em'
    body:
        fontFamily: 'Nunito Variable, system-ui, sans-serif'
        fontSize: '1rem'
        fontWeight: 700
        lineHeight: 1.5
    label:
        fontFamily: 'Nunito Variable, system-ui, sans-serif'
        fontSize: '0.75rem'
        fontWeight: 700
        lineHeight: 1.2
rounded:
    field: '0.9rem'
    selector: '1rem'
    box: '1.4rem'
    pill: '999px'
spacing:
    xs: '0.35rem'
    sm: '0.5rem'
    md: '0.75rem'
    lg: '1.25rem'
    xl: '2rem'
components:
    button-primary:
        backgroundColor: '{colors.sunset-orange}'
        textColor: '{colors.cream-paper}'
        typography: '{typography.title}'
        rounded: '{rounded.field}'
        height: '2.5rem'
    button-secondary:
        backgroundColor: '{colors.pool-blue}'
        textColor: '{colors.cream-paper}'
        rounded: '{rounded.field}'
    button-disabled:
        backgroundColor: '{colors.toasted-sand}'
        textColor: '{colors.ink-text}'
    move-hit:
        backgroundColor: '{colors.hit-green}'
        textColor: '{colors.ink-text}'
        typography: '{typography.headline}'
        rounded: '{rounded.field}'
        height: '3.75rem'
        width: '8.5rem'
    move-stand:
        backgroundColor: '{colors.stand-red}'
        textColor: '{colors.cream-paper}'
        rounded: '{rounded.field}'
        height: '3.75rem'
    move-double:
        backgroundColor: '{colors.lemon-pop}'
        textColor: '{colors.ink-text}'
        rounded: '{rounded.field}'
        height: '3.75rem'
    move-split:
        backgroundColor: '{colors.pool-blue}'
        textColor: '{colors.cream-paper}'
        rounded: '{rounded.field}'
        height: '3.75rem'
    chip-button:
        backgroundColor: '{colors.stand-red}'
        textColor: '{colors.cream-paper}'
        rounded: '{rounded.pill}'
        size: '3.6rem'
    status-banner:
        backgroundColor: '{colors.lemon-pop}'
        textColor: '{colors.ink-text}'
        typography: '{typography.headline}'
        rounded: '{rounded.pill}'
        padding: '0.35rem 1.1rem'
    card:
        backgroundColor: '{colors.cream-paper}'
        textColor: '{colors.ink-text}'
        rounded: '{rounded.box}'
    input:
        backgroundColor: '{colors.cream-paper}'
        textColor: '{colors.ink-text}'
        rounded: '{rounded.field}'
    app-bar:
        backgroundColor: '{colors.sunset-orange}'
        textColor: '{colors.cream-paper}'
        height: '3.75rem'
        padding: '0.5rem 1.25rem'
    nav-link-active:
        backgroundColor: '{colors.cream-paper}'
        textColor: '{colors.ink-text}'
        rounded: '{rounded.pill}'
        padding: '0.35rem 1rem'
---

# Design System: Blackjack Party

## Overview

**Creative North Star: "Game Night Arcade"**

Blackjack Party looks like a friendly board game crossed with an arcade cabinet. Every surface is a thick, toy-like
object: a cream or candy-colored face, a 3px night-ink outline, and a hard offset shadow with no blur that makes it
sit up off the page. The table itself is a big, flat felt-green stage with an orange rail, drawn in the same outlined
style, so the Angular controls around it and the PixiJS scene read as one world.

Color is bright and plentiful but always has a job. Each table action owns a color (Hit green, Stand red, Double
lemon, Split blue). Chips are coded by value. Results are coded by outcome. A shared ink color holds it all
together. Type is loud where it labels the game (Lilita One for headings, buttons, pills and every word on the felt)
and plain where it explains (Nunito, set bold throughout so it holds up next to the chunky display face).

Density is generous. Controls are large, easy to hit and easy to read across a room or on a landscape phone.
Playfulness lives in shape, color and motion, never in hiding the game state.

**Key Characteristics:**

- 3px night-ink outlines on every raised element, matched by 4–8px ink strokes in the canvas
- Hard offset drop shadows (6px or 3px straight down, no blur) instead of soft elevation
- Big radii and pill shapes: nothing is sharp-cornered
- One color per meaning: actions, chip values and hand results each have a fixed color
- A warm sand page with a faint tiled print of the four suits behind the content
- One family of drawn line icons (`bj-icon`, round 2.5 stroke); no emoji or text symbols as icons

## Colors

A warm, sunny palette: sunset orange leads, pool blue and lemon support it, all anchored by one deep violet-navy ink.
The UI tokens live in `apps/web/src/styles/theme.css` (DaisyUI theme `arcade`). The canvas copies of them, in hex,
live in `libs/web/table-canvas/src/lib/scene/palette.ts` and must be kept in sync by hand.

### Primary

- **Sunset Orange** (sunset-orange): the app bar, primary buttons (Join table, Sign in, Place bet), the brand
  heading on the auth cards, notification badges. The table rail is its canvas twin (rail-orange).

### Secondary

- **Pool Blue** (pool-blue): Split, the Share link button, table-limit badges, the avatar circle, secondary links
  and the countdown fill. On the felt it shows as `sky` for soft totals and PUSH.

### Tertiary

- **Lemon Pop** (lemon-pop): the status banner ("Pick an open seat to play"), Double, the free-refill button, hand
  totals and BLACKJACK! on the felt, and the card shoe.

### Neutral

- **Night Ink** (night-ink): every outline and hard shadow, the Log out and back buttons, neutral chips. It holds
  the whole system together.
- **Ink Text** (ink-text): all body text and the text on light faces. The canvas uses it as `ink` (#262047).
- **Cream Paper** (cream-paper): card and panel faces, inputs, the active nav pill, and text on dark or saturated
  fills.
- **Warm Sand** (warm-sand): the page background, under the tiled suit print (`--color-pattern`, applied as a mask so the color stays a token).
- **Toasted Sand** (toasted-sand): the solid face of disabled buttons, so they stay readable over the felt.

### Semantic and game colors

- **Hit Green** (hit-green): Hit, the $25 chip, WIN labels.
- **Stand Red** (stand-red): Stand, the $5 chip, LOSE and BUST labels, red suits, an urgent countdown, errors.
- **Marigold** (marigold-warning) and **Sky Info** (sky-info): DaisyUI warning and info alerts.
- **Grape** (grape-chip): the $500 chip only.
- **Felt Green / Felt Shadow** (felt-green, felt-shadow): the table surface. **Felt Print** (felt-print) is the
  mint color of the printed payout rules and the insurance arc.
- **Card Cream** (card-cream): card faces.
- **Floor** (`--color-floor`, canvas `floor`): the dark room below the rail, filling any letterbox around the stage.

### Named Rules

**The One Meaning Rule.** A game color always means the same thing everywhere: Hit is always green, Stand always red,
$100 is always blue, in the HUD and on the felt. Never reuse an action or chip color for decoration.

**The Theme File Rule.** UI colors are defined only in `theme.css` and the canvas palette only in `palette.ts`.
Components use semantic names (`primary`, `neutral`, `--color-felt`), never raw values.

## Typography

**Display Font:** Lilita One (with system-ui, sans-serif)
**Body Font:** Nunito Variable (with system-ui, sans-serif), both loaded through Fontsource

**Character:** Lilita One is a heavy, rounded poster face that reads like a game logo. Nunito's rounded terminals
match it, and setting all body text bold keeps the pair from feeling lopsided.

### Hierarchy

- **Display** (Lilita One, 2.25rem on phones to 3rem on desktop, line-height 1): page headings such as "Pick a
  table" and the auth card titles.
- **Headline** (Lilita One, 1.5rem): table card names, table action buttons, the status banner (fluid
  1rem–1.5rem), canvas labels (26px with a 6px ink stroke).
- **Title** (Lilita One, 1–1.15rem, letter-spacing 0.02em): buttons, nav links, the username, panel headings,
  pills.
- **Body** (Nunito bold 700, 1rem): descriptions, form labels, chat, the table log.
- **Label** (Nunito bold, 0.62–0.75rem): keyboard hints on the action buttons, page subtitles, badge counts.

### Named Rules

**The Display Speaks for the Game Rule.** Anything a player acts on or watches (buttons, pills, banners, totals,
results) is set in Lilita One. Explanations and conversation stay in Nunito.

**The Always Bold Rule.** Body text is bold by default (`font-bold` on `body`). Don't set regular-weight running
text next to the display face.

## Layout

- The app is a full-height column: the app bar, then one scrolling page area (`100dvh`).
- Content pages center in `max-w-6xl` with 1rem padding on phones and 2rem on desktop. The lobby is a card grid:
  1 column, 2 from `sm`, 3 from `lg`, with a 1.25rem gap.
- Auth screens put one centered card, at most 24rem wide, in the middle of the viewport.
- The table uses a fixed 1600×900 logical stage that is letterboxed under the HUD, with the felt filling the whole
  canvas. The HUD floats over it as a three-column grid (title pill · banner · actions). The bet panel and action
  bar sit at the bottom; chat and the log are collapsible floating panels in the corners.
- Breakpoints in use: 480px (smallest phones), 767px or a max-height of 500px (phones and landscape phones: the app
  bar shows the screen's title, the table title pill hides), 900px (the username hides), 1000px (action buttons
  shrink to 5rem × 2.5rem).
- Spacing is a loose rhythm of 0.35 / 0.5 / 0.75 / 1.25 / 2rem. Controls are spaced 0.5–0.65rem apart.

## Elevation & Depth

Depth is made with outlines and hard offset shadows, never with blur. A raised object has a 3px night-ink border
and a solid ink shadow dropped straight down. Pressing it moves it down and shortens the shadow, so buttons feel
like physical keys. The page behind adds texture with a faint tiled suit print, not with
gradients on surfaces.

### Shadow Vocabulary

- **Chunky** (`box-shadow: 0 6px 0 0 oklch(25% 0.06 280)`, utility `chunky`): cards, large primary buttons.
- **Chunky small** (`box-shadow: 0 3px 0 0 oklch(25% 0.06 280)`, utility `chunky-sm`): small buttons, pills, chips,
  floating panels, table action buttons at rest.
- **Lifted** (`0 5px 0 0` night ink, with `translateY(-2px)`): a table action button on hover.
- **Pressed** (`0 1px 0 0` night ink, with `translateY(2px)`): a table action button while pressed.

### Named Rules

**The Always Chunky Rule.** Every raised surface gets the 3px ink border plus a hard offset shadow. No soft or
blurred shadows and no glass effects on surfaces. The collapsed chat/log toggles follow it too: solid cream circles on the dark floor below the rail.

**The Flat When Disabled Rule.** Disabled controls lose their shadow and outline strength and get a solid toasted
sand face. They sink; they never just fade out.

## Shapes

Everything is soft and toy-like. Inputs and action buttons use 0.9rem corners, small controls 1rem, cards and
panels 1.4rem. Status banners, the title pill, nav links, the Log out button and badges are full pills. Avatars,
chips, the back button and seat markers are circles. In the canvas, cards use 12px corners and pills are fully
rounded, and both carry a 4px ink stroke so they match the 3px CSS outline at stage scale. Chips have a white inner
ring, like real casino chips.

## Components

### Buttons

Tactile and confident: they look like keys you can press.

- **Shape:** gently rounded (0.9rem), 3px night-ink border.
- **Primary:** sunset orange with cream text and a chunky shadow (`btn btn-primary chunky` or `chunky-sm`).
- **Secondary:** pool blue (Share link). **Neutral:** night ink with cream text (Log out, back).
- **Hover / Active:** a slight lift and brightness on hover, then a press down that shortens the shadow.
- **Disabled:** solid toasted sand face, 35–45% ink text, no shadow.

### Table action buttons (signature)

Four big color-coded keys: Hit (green), Stand (red), Double (lemon), Split (blue). Each is 8.5rem × 3.75rem, set in
Lilita One at 1.5rem, with its keyboard key (H, S, D, P) shown quietly in the top-right corner. Below 1000px wide
or 500px tall they shrink to 5rem × 2.5rem and drop the key hints.

### Chips (signature)

Round buttons 3.6rem across (2.8rem on short screens), with a 4px ink border, a white inner ring made with a radial
gradient, and the value in Lilita One with an ink text shadow. Colors: $5 red, $25 green, $100 blue, $500 grape.
On hover a chip lifts and tilts (`translateY(-4px) rotate(-8deg)`). One chip-shaped tool slot clears the bet (✕) or
repeats the last one (↻). Chips on the felt use the same colors.

### Cards / Containers

- **Corner Style:** 1.4rem.
- **Background:** cream paper.
- **Shadow Strategy:** chunky (6px) for lobby and auth cards, chunky small for floating panels.
- **Border:** 3px night ink.
- **Internal Padding:** the DaisyUI card body; floating panels use 0.5rem × 0.7rem.

### Inputs / Fields

DaisyUI `input input-lg` on cream with 0.9rem corners and the theme's 3px border. Show/Hide password is a joined
button. Field errors appear below in stand red, in small bold text. Form-level errors use a full-width
`alert alert-error`.

### Navigation

A sunset-orange app bar, 3.75rem tall, with a 3px ink bottom border. The brand "♠ Blackjack Party" is in Lilita
One at 1.5rem with an ink text shadow. Nav links are pills: transparent at rest, a 15% cream tint on hover, and
cream with an ink border when active. On the right: balance, a separator, the avatar initial in a blue circle, and
the dark Log out pill. On phones the screen's own title and a round back button replace the brand and the menu.

### Status banner and pills

The banner at the top of the table is a lemon pill with an ink border and a chunky-small shadow, holding the one
sentence that says what is happening right now. On the felt, hand totals and results are pills with a 4px ink
stroke: lemon for totals and BLACKJACK!, green for WIN, blue for soft totals and PUSH, red for LOSE and BUST.

### Countdown

A thin bar (0.5rem by default) that drains from right to left. It's pool blue, turns stand red when time is
almost up, and glides in step with the 200ms tick.

## Do's and Don'ts

### Do:

- **Do** give every raised element the 3px night-ink border and one of the two hard shadows (`chunky` / `chunky-sm`).
- **Do** keep each game color tied to one meaning: Hit green, Stand red, Double lemon, Split blue; chips $5 red,
  $25 green, $100 blue, $500 grape.
- **Do** set anything actionable or game-state in Lilita One, and keep explanatory text in bold Nunito.
- **Do** add new colors only in `theme.css`, and mirror any change the canvas needs in `palette.ts`.
- **Do** give disabled controls a solid toasted sand face so they stay readable over the felt.
- **Do** use pills and circles for status, badges, chips and avatars, and 0.9–1.4rem corners for everything else.

### Don't:

- **Don't** use soft or blurred box shadows, glassmorphism or gradient surfaces on controls and cards.
- **Don't** use sharp corners or hairline (1px) borders on raised elements.
- **Don't** reuse an action, chip or result color for decoration.
- **Don't** hard-code color values in components; use the semantic theme names.
- **Don't** name component classes after DaisyUI components (`title`, `status`); use names like `table-title` or
  `status-bar`.
