# Prism Row — Arcade Hub

A 5-game browser arcade built with React, for a college mid-sem team
project. Five self-contained games (Breakout, Snake, Pong, Tetris-lite,
Blaster) live under a shared hub with a consistent visual identity,
local high scores, and shared UI chrome.

## Quick start

```bash
npm install
npm run dev       # local dev server, http://localhost:5173
npm run build     # production build -> dist/
```

No accounts, no backend, no external APIs. High scores persist in the
browser's localStorage.

## Folder structure

```
src/
  main.jsx              entry point, sets up HashRouter
  App.jsx                route table — one route per game
  index.css               global resets + the retro-arcade backdrop
  styles/tokens.css       ALL design tokens (color/type/spacing) — the
                          single source of truth for the shared look

  components/            shared UI — every game reuses these, nobody
                          reinvents a button or a modal
    Button.jsx / .css
    Modal.jsx / .css       start / pause / game-over panel shell
    ScoreDisplay.jsx/.css   "SCORE ... BEST" readout
    GameFrame.jsx/.css     the wrapper every game renders inside —
                          handles back-to-hub, header, score, mute,
                          pause button, and all 3 overlay screens
    GameCard.jsx/.css      hub tile
    GamePreview.jsx/.css   looping mini animation per game, hub only

  utils/
    storage.js             localStorage read/write for high scores
    sound.js                shared WebAudio SFX engine (no audio files)
    useGameLoop.js          shared requestAnimationFrame + delta-time hook

  pages/
    Hub.jsx / Hub.css       landing page, asymmetric card grid

  games/
    breakout/Breakout.jsx   ← reference implementation, most comments
    snake/Snake.jsx
    pong/Pong.jsx
    tetris/Tetris.jsx
    blaster/Blaster.jsx
```

## Team split (5 people, 5 folders)

Each person owns exactly one file under `src/games/<their-game>/` and
should only need to touch that folder day-to-day — this is what keeps
5 people out of each other's way with minimal merge conflicts.

| Game | Folder | Mechanics to own |
|---|---|---|
| Breakout | `games/breakout/` | paddle/ball physics, brick grid, read this one first — it's the template |
| Snake | `games/snake/` | grid movement, growth, self-collision |
| Pong | `games/pong/` | two paddles, simple AI opponent |
| Tetris-lite | `games/tetris/` | falling pieces, matrix rotation, line clear |
| Blaster | `games/blaster/` | player shooter, enemy formation, waves |

One person (or the strongest JS teammate) should own `components/`,
`utils/`, and `pages/Hub.jsx` — the shared shell — since everyone
else's game depends on it.

**Every game follows the same pattern**, which is what to point at
when explaining "how the site is unified" in the eval:
1. A `status` state machine: `'start' | 'playing' | 'paused' | 'gameover'`
2. Fast-changing physics/positions live in a `useRef`, not `useState`
   (so the browser isn't asked to re-render 60 times a second)
3. `useGameLoop(update, status === 'playing')` drives the frame loop
4. The component renders `<GameFrame status={...} ...>` and GameFrame
   draws the right start/pause/game-over screen automatically
5. On game over: `setHighScoreIfBetter(GAME_ID, score)` from `utils/storage.js`

## Build order (do this sequence, not games-first)

1. **Shell first**: tokens.css → Button/Modal/ScoreDisplay → GameFrame
   → Hub (with placeholder cards). Get someone clicking from the hub
   into an empty game screen and back before any game logic exists.
2. **One reference game**: build Breakout fully (it's done in this
   scaffold — read it before writing your own game).
3. **Games in parallel**: once GameFrame/storage/sound exist, all 5
   games can be built simultaneously with no shared-file conflicts.
4. **Polish pass**: sound, difficulty curves, mobile controls, then a
   full playtest of all 5 games back-to-back.

## Week-by-week plan (today → Oct 15)

- **Week 1** — Shell + Breakout (done in this scaffold; spend the week
  making sure every teammate can run it locally, understands the
  GameFrame/storage/sound pattern, and picks their game).
- **Week 2** — Each teammate builds their game's *core mechanics*
  (movement, collision, one full playable loop) — doesn't need to be
  pretty yet, needs to work.
- **Week 3** — Start/pause/game-over wiring via GameFrame, high scores,
  sound effects, difficulty progression. This is also when the shared
  UI needs to stay consistent — no teammate invents their own button.
- **Week 4 (through Oct 15)** — Full playtest of all 5 games, bug
  fixes, mobile/touch pass, and rehearsing what each person will
  explain live (their file, their state machine, their one trickiest
  bug and how they fixed it).

## What's already fully working in this scaffold

All 5 games are playable end-to-end right now: start screen, working
core mechanics, pause, game over with restart, score + persisted high
score, WebAudio sound effects, and difficulty progression. Treat them
as a working baseline to refine, extend, or restyle — not just a shell
to fill in.
