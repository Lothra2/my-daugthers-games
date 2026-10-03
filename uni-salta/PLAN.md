# UNI-SALTA · Master Production Plan

**Status:** v1.0 of the plan, written by the lead director (planning phase). Nothing in it has been built yet.
**Concept author:** Sophie, age 7. **Producer:** Rick (dad).
**Executor:** the coding agent that picks up this plan, called "Sonnet" below.
**Repo:** `Lothra2/my-daugthers-games`, folder `uni-salta/`.

> The rule that overrides everything else: **do not lose Sophie's child-drawn soul.**
> When Sophie sees any screen of the finished game, she has to say "that's my game."
> If a technical or artistic decision makes the game more generic, it is the wrong decision.

---

## 0. How to read this document

- Sections 1 to 55 are the full design and technical spec, in the order the brief asked for.
- **Section 56 is the SONNET 5.5 EXECUTION BLUEPRINT.** Sonnet executes it phase by phase, from top to bottom. Sonnet does not skip ahead and does not merge phases.
- Wherever the plan says "MUST", that is a hard requirement. "SHOULD" means the default, and a deviation needs a short note in `uni-salta/docs/DECISIONS.md`.
- All numbers here are starting values. Changing them during balancing is expected. The place they live is `src/config.js`, and nowhere else.

### 0.1 Decisions already taken with Rick (do not re-open)

| # | Topic | Decision |
|---|---|---|
| D1 | Concept author | Sophie (7). |
| D2 | Easy mode | Required, designed for Alana (4, almost 5). Name: **Modo Nubecita** (easy) and **Modo Arcoíris** (normal). |
| D3 | Legs | Stick legs kept as a signature, but drawn 2px thick so they read at game size. |
| D4 | Locomotion | **Runs on two legs**, arms pumping, like a cartoon character. Never on four legs like a horse. |
| D5 | References | The 9 images in `uni-salta/reference/` are Sophie's drawings, already digitized. They are the source of truth. Never edit or delete them. |
| D6 | Hanging snake | The vertical snake **hangs from a cloud**. It is a second crouch obstacle. |
| D7 | Bump on snake | A drawing error. Remove it. |
| D8 | Candy art | Already supplied. Green and red are round balls, yellow comes as a lollipop plus a swirl disc. |
| D9 | Title screen | Keep Sophie's text "al entrar... ya vas a jugar!" and her "Uni-salta" button, recomposed for **landscape**, with working buttons, motion, sound. "Make it magical." |
| D10 | Languages | Spanish (default) and English. |
| D11 | Devices | Tablet first, plus iPhone 15 Pro Max and Samsung Galaxy S23. Desktop browser is supported. |
| D12 | Audio providers | Fish Audio has no connector in this environment. Use Higgsfield for anything generated. Music and SFX are made in code (see 27 to 29). |
| D13 | Higgsfield budget | Rick loaded USD 10. **The account showed 0.76 credits when this plan was written.** See risk R1. |
| D14 | Hosting | GitHub (GitHub Pages from this repo). |
| D15 | Plan location | This file, `uni-salta/PLAN.md`, with references in `uni-salta/reference/`. |
| D16 | Ambition | Rick asked to take Mario as the reference for pixel craft and level feel, add more worlds than Sophie drew, and make it magical, charming, challenging and consistent. Max use of Motion and Higgsfield. |
| D17 | Motion library | Loaded from CDN (`motion@14.0.0`). Used for the DOM UI layer, see 35. |

### 0.2 Decisions taken by the director in this plan (Rick can veto)

| # | Decision | Why |
|---|---|---|
| P1 | **Phaser 3.90.0** via CDN, no build step | Mature, pixel-art first, huge example base so the agent writes correct code fast. Phaser 4 is newer (4.0 shipped April 2026) and the agent has less reliable knowledge of it. |
| P2 | Game logic is a **pure, deterministic JS core** (no Phaser inside), and Phaser only renders | So the level validator, tests and balancing bot run in Node on the exact same physics. |
| P3 | **Music is composed as note data and synthesized live** with Web Audio (NES-style channels) | Adaptive layers stay perfectly in sync, cost zero credits, weigh zero MB, and sound authentically "pixel". Higgsfield's music model is not available for standalone use. |
| P4 | **SFX made with ZzFX** (MIT, about 1 KB) | Instant, tunable, retro, no files. |
| P5 | **Voice lines recorded by Sophie** (and Alana if she wants), with Higgsfield TTS as fallback | Nothing keeps "Sophie's soul" like her own voice saying "¡Uni-salta!". |
| P6 | **6 worlds** in a loop, Mario-style world cards | Sophie's world is World 1, five new worlds grow out of it. |
| P7 | **Stomp mechanic**: landing on a flat slime bounces you (Mario goomba feel). Spiky slime cannot be stomped | Uses both of Sophie's slime drawings, adds skill depth without new buttons. |
| P8 | **Gaps** (holes in the cloud floor) from World 2 | The classic Mario jump challenge. Off in easy mode. |
| P9 | **Caramelitos**: small yellow swirl candies = the "coins". The yellow **lollipop** = FAST power-up | Runners need a coin item for lines and arcs. Sophie's swirl disc becomes the coin, and her lollipop becomes the yellow power. Shape and size make the two very different. **Open for Rick to confirm.** |
| P10 | Lives shown as **hearts** | Kids read hearts instantly (Mario, Zelda), and the pink/red palette is already in Sophie's world. |
| P11 | The yellow FAST power **clears obstacles from the generator** while active | Speed without safety would just kill kids. FAST becomes a joyful "candy sprint". |
| P12 | During the red INVINCIBLE power, a **rainbow bridge** appears under the unicorn over gaps | Mario's star does not protect you from pits, but for kids that feels unfair. A rainbow road fits Sophie's rainbow. |
| P13 | Greybox first, art second | The game must be fun with rectangles before any credit is spent. |

---

## 1. Executive vision

UNI-SALTA is a bright, fast, joyful pixel-art endless runner. A happy little cat-unicorn with a pink mane and a golden horn runs across a lavender sky of pink cotton-candy clouds. She jumps over slimes, ducks under snakes, and eats magic candies that make her fast, slow down time, or turn her into a rainbow.

Three ideas define it:

1. **It is Sophie's game.** Every character, color and rule comes from her drawings. We add craft, not replacement.
2. **It feels like a real Nintendo-quality game.** Mario-level pixel discipline, responsive controls with variable jump height, coyote time and input buffering, hand-made animation frames, and juice on every action.
3. **Two sisters can both play it.** Alana (4) plays Modo Nubecita, where she never loses. Sophie (7) plays Modo Arcoíris, a real challenge with high scores to beat.

The target is a small premium indie game that loads in seconds on an iPad or phone, runs at 60 fps, and makes a 7-year-old ask for "one more try."

---

## 2. Final interpretation of the original drawings

### 2.1 Asset inventory

All 9 references are AI-digitized versions of Sophie's paper drawings. They are already pixel styled, on an effective grid of about 48 to 50 logical pixels across, upscaled about 25x, on an opaque white background (except the two scenes). They are **concept art**. None of them goes into the game directly.

| File | What it is | Game purpose | Must remain | Improve | Production format | Animation variants | Higgsfield? | Manual cleanup? |
|---|---|---|---|---|---|---|---|---|
| `ref_unicorn.png` | The hero, waving, flying pose | Player character | Cat ears with pink inside, big round white head, short golden spiral horn centered on top, closed happy "^ ^" eyes, pink blush stripes, tiny dark nose, cat "w" smile, white bean body, stick arms and legs, long pink mane behind the head, big fluffy pink tail, the waving hand | Side-view pose for running (the drawing is 3/4 front), consistent proportions, legs readable at 2px, consistent outline color | 48x48 cell sprite strips per animation | All of section 19 | Yes: model sheet, keyframes, AutoSprite | Yes, always |
| `ref_title_screen.webp` | Portrait title screen | Title screen | Purple scribble sky, text "al entrar..." / "ya vas a jugar!" / ". . .", cream button with orange border saying "Uni-salta", unicorn flying diagonally up to the right, rainbow (red, orange, yellow, green, blue) coming from behind her | Landscape layout, real logo, live animation, working buttons | Phaser scene + DOM overlay | Title fly loop, button pulse, typewriter text | Yes: key art reference, logo | Yes |
| `ref_world_candy_clouds.webp` | Gameplay world | World 1 look | Lavender sky with diagonal light streaks, big pink clouds, small pink cloudlets, pink cloud floor, yellow light glowing from the right edge, snake flying horizontally mid-height, slime standing on the floor | Parallax layers, tileable floor, readability layer rules | Sky gradient (code) + cloud prop kit + 16x16 floor tiles | Cloud drift, light shimmer | Yes: prop kit and tiles | Yes |
| `ref_snake_hanging.png` | Vertical snake | Hanging snake (crouch obstacle) | Lime-green body, long wavy shape, angry eyebrows, round black eyes with white shine, pink forked tongue, pale highlight stripe | Remove the side bump (D7), head at bottom, body hangs from a cloud | Head 32x32 + 16x16 body segment + cloud anchor | Drop in, sway, tongue flick, stomped dizzy (invincible) | Light (variants only) | Yes |
| (snake in `ref_world_candy_clouds.webp`) | Horizontal snake | Flying snake (crouch obstacle) | Long thin lime body, tapered tail, rounder head, neutral dot face, pink forked tongue | Readable silhouette at 64x24 | 64x24 strip | Slither, tongue flick, pop | Yes: AutoSprite custom "slither" | Yes |
| `ref_slime_flat.png` | Wide flat slime, two big eyes, toothy grin | Flat slime (jump or stomp) | Lumpy wide shape, glossy lime body, big round eyes with green iris, 4 big white teeth in a grin | Smaller grid, squash and stretch | 40x24 strip | Wobble, look-up, stomped, pop | Optional | Yes, frames done by hand |
| (slime in `ref_world_candy_clouds.webp`) | Tall spiky slime, spiral eyes | Spiky slime (jump only, no stomp) | Flame-like spiky top, spiral dizzy eyes, small mouth, darker lime | Clear "do not stomp" read: spikes and darker outline | 32x32 strip | Wobble, hop (World 5) | Optional | Yes |
| `ref_candy_yellow_lollipop.png` | Yellow lollipop | **FAST** power-up | Yellow swirl with orange spiral lines, cream stick, black outline | Size 16x24, glow halo | 16x24 strip | Shine loop, bob | No | Yes (downscale) |
| `ref_candy_yellow_swirl.png` | Yellow swirl disc | **Caramelito** (coin) | Yellow disc, orange spiral, white shine top-left | Shrink to 10x10 | 10x10 strip | Spin 4f | No | Yes |
| `ref_candy_green.png` | Green ball candy | **SLOW** power-up | Emerald ball, diagonal shine stripes, big white highlight | 16x16, sparkle halo so it never reads as a slime | 16x16 strip | Shine loop, bob | No | Yes |
| `ref_candy_red.png` | Red ball candy | **INVINCIBLE** power-up | Red ball, pink diagonal stripes, white highlight | 16x16, star sparkle halo | 16x16 strip | Shine loop, bob | No | Yes |

### 2.2 What the drawings tell us (reading them seriously)

- **The unicorn is a cat.** Ears, nose and "w" mouth are a cat's. This is the single most important identity trait and the brief missed it. Every generation prompt MUST say "cat-unicorn".
- **The eyes are always closed and happy.** This is the default face. Open eyes are reserved for surprise (hit), focus (fast run) and the start-of-game "ready!" moment.
- **She waves.** In both unicorn drawings the right arm is raised in a wave. The wave becomes the signature celebration move.
- **The rainbow comes out of her.** In the title drawing the rainbow trails from her body. In game, the rainbow trail is her motion trail.
- **The world leans diagonally.** The sky scribbles in both scenes run diagonally. We keep diagonal light streaks in the sky layer of every world.
- **There is a yellow light from the right.** It reads as "where we are going." It becomes the world's sun or goal glow on the right edge.
- **The enemies are silly, not scary.** Grins, spiral eyes, angry eyebrows on a noodle. They get comic reactions, never gore or fear.
- **Two snakes, two slimes.** Sophie drew two different snakes and two different slimes. We use all four as distinct obstacles instead of picking one.

---

## 3. Core gameplay specification

- **Genre:** 2D side-scrolling endless runner with Mario-style platforming touches.
- **View:** side view, landscape, the unicorn at a fixed screen x, the world scrolling right to left.
- **Session:** a normal run lasts 1 to 6 minutes. Restart takes under 1 second.
- **Goal:** go as far as possible, collect candy, beat your high score, reach new worlds.
- **Structure:** an endless journey through 6 worlds in a fixed order. After World 6 the trip loops to World 1 as "Vuelta 2" (Lap 2), faster and harder, then Lap 3, and so on.
- **World length:** about 70 seconds of play each at normal speed (about 650 m in World 1 up to 1200 m in World 6).
- **Failure:** 3 hearts in Modo Arcoíris. In Modo Nubecita there is no failure.

### 3.1 Core loop

Run, read the next obstacle, jump/crouch/stomp, grab candy, trigger a power, survive the next pattern, speed rises, reach a world card, new world, new twist, repeat. Every 30 to 60 seconds something new appears: a new world, a power-up, a heart, a perfect-streak rainbow.

### 3.2 Obstacles and hazards (full list)

| Hazard | First world | Answer |
|---|---|---|
| Flat slime | 1 | Jump over it, or **stomp** it for a bounce and points |
| Flying snake | 1 | Crouch |
| Hanging snake (from a cloud) | 2 | Crouch |
| Gap in the cloud floor | 2 | Jump (never in Modo Nubecita) |
| Spiky slime | 3 | Jump over, **no stomp** (stomping it hurts) |
| Floating cloud platforms | 2 | Optional higher path with more candy |
| Surprise block ("Bloque Estrella") | 3 | Jump into it from below for a candy burst |
| Hopping spiky slime | 5 | Timing jump |
| Snake pairs (high + low combos) | 4 | Crouch then jump |
| Moving cloud platforms | 5 | Optional path |

---

## 4. Controls

| Action | Keyboard | Mouse | Touch | Gamepad (bonus) |
|---|---|---|---|---|
| Jump (tap = short hop, hold = full jump) | Space, Up, W | Left click on the right half of the screen | Touch the **right half** of the screen | A |
| Crouch (hold) | Down, S | (none) | Touch and hold the **left half** of the screen | B or D-pad down |
| Fast-fall (crouch in the air) | Down, S | (none) | Left half while in the air | Down |
| Pause | Esc, P | Pause button | Pause button (top right) | Start |
| Confirm in menus | Space, Enter | Click | Tap | A |

Rules:
- Both halves can be held at the same time. Jumping while crouching cancels the crouch and jumps.
- Touch zones cover the **whole** half of the screen. Little kids do not aim.
- A faint up-arrow icon (right) and down-arrow icon (left) show in the lower corners for the first 10 seconds of every run, and always in Modo Nubecita. Setting: "Show touch hints".
- No swipes. Swipes are unreliable for 4-year-olds and add latency.
- iOS/Android: `touch-action: none`, no text selection, no long-press callout, no double-tap zoom.

---

## 5. Player movement model

All movement runs in the deterministic core at a **fixed 60 Hz step** with render interpolation (so 120 Hz screens are smooth). Units are internal pixels and seconds.

| Parameter | Value | Note |
|---|---|---|
| Player screen x | 80 px from the left edge | Fixed |
| Ground top | `H - 40` | The floor is 40 px tall |
| Jump initial velocity | -470 px/s | |
| Gravity while rising with the button held | 1400 px/s² | Full jump apex is about 79 px |
| Gravity while rising with the button released | 3600 px/s² | Short hop apex is about 30 px (variable jump) |
| Gravity falling | 2600 px/s² | Snappier fall than rise, Mario feel |
| Fast-fall gravity | 4200 px/s² | Crouch held in the air |
| Max fall speed | 520 px/s | |
| Coyote time | 90 ms | Jump still allowed after leaving a ledge |
| Jump buffer | 130 ms | A jump pressed just before landing fires on landing |
| Crouch enter | Immediate (same tick) | The hitbox changes on the same tick as the input |
| Crouch exit | 2 ticks | |
| Stomp bounce | -420 px/s, or -520 px/s if jump is held | |
| Landing squash | Visual only, 3 frames | Never delays the next jump |

**Anticipation without lag:** the brief asks for a jump anticipation frame. A real wind-up would add input latency, and in a runner that feels broken. Solution: the takeoff tick shows a squash frame **while the body is already rising**. The eye reads it as anticipation, and physics has zero delay. This is a hard rule.

### 5.1 World speed

| Context | Start | End of world |
|---|---|---|
| World 1 | 140 px/s | 160 |
| World 2 | 165 | 185 |
| World 3 | 190 | 210 |
| World 4 | 215 | 235 |
| World 5 | 240 | 260 |
| World 6 | 265 | 285 |
| Lap 2+ | previous × 1.08 per lap | hard cap 330 |
| Modo Nubecita | 95 | hard cap 150, no lap increase |

Speed rises linearly inside a world, and eases (0.8 s) on world change.

Displayed distance: **1 meter = 16 px (one tile)**.

---

## 6. Game-state model

### 6.1 App states (top level)

```
BOOT -> PRELOAD -> TITLE -> MODE_SELECT -> WORLD_INTRO -> PLAYING
PLAYING <-> PAUSED
PLAYING -> WORLD_CLEAR -> WORLD_INTRO (next world)
PLAYING -> GAME_OVER -> (REPLAY -> WORLD_INTRO world 1) | TITLE
TITLE -> SETTINGS | GALLERY (when unlocked) | HIGH_SCORES
ANY -> ROTATE_DEVICE (portrait overlay, pauses the game)
```

- `MODE_SELECT` is part of the title screen: pressing "Uni-salta" reveals the two mode buttons.
- `WORLD_INTRO` is the Mario-style world card (1.6 s, skippable after 0.6 s by tapping).
- `WORLD_CLEAR` is a 1.2 s jingle with a candy fountain while the world crossfades. **Gameplay does not stop:** the next world fades in during a guaranteed obstacle-free "breather" chunk.

### 6.2 Run states (inside PLAYING)

`running`, `respawning` (after a gap fall), `hitstop` (80 ms freeze), `dying` (last heart, 1.2 s tired animation), `paused`.

### 6.3 Player FSM

```
RUN -> JUMP_RISE -> JUMP_APEX -> FALL -> LAND -> RUN
RUN -> CROUCH_ENTER -> CROUCH_RUN -> CROUCH_EXIT -> RUN
JUMP_RISE / JUMP_APEX / FALL + crouch -> FAST_FALL -> LAND
FALL onto flat slime -> STOMP_BOUNCE -> JUMP_RISE
ANY (not invulnerable) + hazard -> HIT -> RUN (blinking) | TIRED (last heart)
gap -> FALL_OUT -> RESPAWN (rescue cloud) -> RUN
```

The overlay states `fast`, `slow`, `invincible` change visuals and physics multipliers but not the FSM.

---

## 7. Character specification: the cat-unicorn

**Name proposal:** let Sophie name her. Placeholder: **"Uni"**. The name shows only on the title screen and the gallery.

### 7.1 Identity lock (paste this text into every generation prompt)

> A small chibi **cat-unicorn**. Big round white head, about half of her total height, with two pointy cat ears with pink inner ears. A short golden-yellow spiral horn centered on top of the head. Closed happy eyes drawn as upside-down U arcs. Pink blush stripes on both cheeks. A tiny dark nose and a cat "w" smile. A small white bean-shaped body. Thin stick arms and stick legs, 2 pixels thick, white with dark outline. A long flowing bright-pink mane behind the head, and a big fluffy bright-pink tail. She stands and runs on two legs like a cartoon character. Always cheerful.

### 7.2 Proportions at game size

- Cell: **48x48**. Character bounding box standing: about **30 w x 38 h** including the horn.
- Head: about 20x18 px. Body: about 12x11 px. Legs: 8 to 9 px long, 2 px thick. Horn: 4x7 px.
- Pivot: bottom center of the feet at cell (24, 46).
- Hitbox standing: 16 w x 28 h, centered on the body, horn excluded. Crouching: 22 w x 16 h.

### 7.3 Palette (unicorn ramp, part of the master palette in section 17)

| Use | Hex |
|---|---|
| Outline | `#1E1330` (deep plum, not pure black) |
| White body, light | `#FFFFFF` |
| White body, shade 1 | `#F1E8F7` |
| White body, shade 2 | `#CDBCE3` (lavender shadow ties her to the sky) |
| Mane/tail highlight | `#FFD3EA` |
| Mane/tail base | `#FF85C4` |
| Mane/tail shade | `#E0529F` |
| Mane/tail deep | `#A93379` |
| Horn light / base / shade | `#FFF27A` / `#FFCB2E` / `#D98612` |
| Blush | `#FF9EC7` |
| Nose | `#3A2440` |

### 7.4 Personality in motion

Bouncy, never heavy. Every step has a little head bob. The mane trails 1 to 2 frames behind the head. The tail follows 2 frames behind the body. The horn sparkles once every few seconds at random (1 sparkle pixel, 3 frames).

---

## 8. Enemy specification

All enemies are silly. They react to the unicorn. None of them chase, shoot or show anything scary.

| Enemy | Cell | Hurtbox | Placement | Behavior | Personality beats |
|---|---|---|---|---|---|
| **Flat slime** ("Babas") | 40x24 | 30 w x 14 h, bottom aligned | On the floor | Idle wobble. When the unicorn is directly above it, its eyes look up. Stompable. | Grin with 4 teeth. When stomped: flattens into a puddle, eyes go spiral, says a little "blub" and reforms behind (gone). |
| **Spiky slime** ("Pinchito") | 32x32 | 20 w x 22 h | On the floor | Wobble. World 5: hops 24 px every 1.2 s. **Not stompable** (spikes). | Spiral eyes always (it was born dizzy). Stomping it gives a "¡Ay!" hit, not a kill. |
| **Flying snake** ("Fideo") | 64x24 | Head 14x9 + body 40x8, compound | Body center at y = ground - 26 | Slithers left 30 px/s faster than the world, ±2 px sine bob. | Neutral dot face, tongue flick every 1.5 s. If the unicorn crouches under it, its eyes follow down. |
| **Hanging snake** ("Colgadito") | Head 32x32 + body segments 16x16 + cloud anchor 48x24 | Head 16x12 + body 8 w column | Hangs from a cloud, head hurtbox bottom at ground - 22 | Drops into position when the unicorn is 1.3 s away (warning: the cloud wiggles 0.4 s before). Then sways ±2 px. | Angry eyebrows, tongue flick. When passed: eyebrows relax into a pout. |

### 8.1 Crouch clearance math (must hold)

- Standing hitbox top = `ground - 28`. Crouching hitbox top = `ground - 16`.
- Flying snake hurtbox bottom = `ground - 22`. Hanging snake head hurtbox bottom = `ground - 22`.
- So standing always overlaps by 6 px (a hit), and crouching always clears with 6 px of margin.
- A full jump also clears the flying snake (it passes over it). This is allowed and is a skill move, but the patterns are designed for crouching.

---

## 9. Candy and power-up specification

| Item | Art | Size | Effect | Duration | Points | Pickup radius |
|---|---|---|---|---|---|---|
| **Caramelito** (coin) | Yellow swirl disc | 10x10 | Points. Every 100 gives a heart (or +500 if lives are full). | n/a | 10 | 10 px |
| **Yellow lollipop: FAST** ("¡Rayo!") | Lollipop | 16x24 | World speed × 1.6. Score × 2. **Generator spawns only candy trails, no hazards** (candy sprint). Ends with a 1 s grace where no hazard spawns within 2 s of travel. | 4 s | 50 | 12 px |
| **Green ball: SLOW** ("Calma") | Green ball | 16x16 | World time × 0.6 (scroll, enemies, particles). The player's physics stays at 1.0, so she feels light and precise. Music tempo × 0.8 with a low-pass filter. | 5 s | 50 | 12 px |
| **Red ball: INVINCIBLE** ("¡Arcoíris!") | Red ball | 16x16 | Touching enemies pops them into caramelitos (+200 each). Rainbow bridge over gaps. The last 1.5 s blink to warn. | **5 s** (Sophie's rule) | 50 | 12 px |
| **Heart** (1-UP) | Pixel heart | 16x16 | +1 heart, max 3 | n/a | 100 | 12 px |

Rules:
- One power at a time. A new power replaces the active one. The exception: red cannot be replaced by green or yellow until it ends (the pickup is still collected for points).
- Power candies float with a 2 px bob at 1 Hz and have a 1 px sparkle halo (white/star pixels) so the green candy never reads as a slime. Slimes are lime with faces. The green candy is emerald, shiny, faceless and floating.
- Frequency: about one power candy every 20 to 30 s, weighted. Red is the rarest (weight 1), green 2, yellow 2. Hearts appear only when lives < 3, at most one per 45 s.
- Power candies sit on a slightly risky path (top of an arc, above a slime) but are never placed so that grabbing them forces a hit.

### 9.1 Collectible patterns

Caramelito formations (each one is a pattern element):
`line_5`, `line_8`, `arc_jump` (follows a full-jump parabola at the current speed), `arc_hop` (short hop), `wave`, `high_line` (on cloud platforms), `crouch_tunnel` (low line under a snake), `stomp_reward` (column above a flat slime), `diamond_cluster`, `heart_shape` (rare, a delight), `zigzag_risk` (between two hazards), `candy_rain` (FAST power only).

Collecting **every** caramelito of one formation gives "¡Perfecto!" +100 and increments the perfect streak (section 11).

---

## 10. Life and damage system

- **3 hearts** in Modo Arcoíris. Top left of the HUD.
- On a hit:
  1. Hitstop 80 ms (the whole game freezes, the unicorn shows the hit frame).
  2. A "¡Ay!" voice line or SFX plus a 4-star burst around the head.
  3. Screen shake 3 px for 150 ms (0 with "Reduce shake").
  4. The heart pops out of the HUD with a Motion spring and breaks into 2 halves.
  5. The unicorn keeps running. She is invulnerable for **1.6 s**, blinking at 10 Hz (or a soft pink tint pulse with "Reduce flashing").
  6. The enemy that hit her plays its reaction and is removed from collision, so no double hit is possible.
- **Gap fall:** -1 heart. The "rescue cloud" (a smiling cloud) floats in from the left and drops her back on the floor 0.8 s later, with 2 s invulnerability. The generator holds a breather chunk.
- **Last heart lost:** `dying`, the tired animation, then GAME_OVER.
- **Modo Nubecita:** a hit still shows the reaction (hitstop, "¡Ay!", stars), but **no heart is lost**. She drops 3 caramelitos that scatter and can be re-collected. Gaps do not exist. There is no game over. A "Terminar" (finish) button in the pause menu ends the run and shows the results screen as a celebration.

---

## 11. Scoring model

Keep it readable for a 7-year-old: **one big number**, the score. The rest is bonus flavor.

| Source | Points |
|---|---|
| Distance | 1 point per meter |
| Caramelito | 10 |
| Power candy | 50 |
| Heart | 100 |
| "¡Perfecto!" formation | +100 |
| Stomp | 100, then 200, 400, 800, 1000 for a chain of stomps without touching the floor (Mario combo) |
| Pop an enemy while invincible | 200 |
| Surprise block | 50 + its candies |
| World clear | 1000 × world number |
| FAST active | all points × 2 |

- **Perfect streak:** 3 "¡Perfecto!" formations in a row paint a small rainbow across the sky (delight) and give +300.
- Floating "+10" style numbers use the pixel bitmap font, rising 12 px and fading over 0.6 s.
- High scores are kept separately per mode.
- Results screen shows: score, meters, caramelitos, best world reached, best score.

---

## 12. Difficulty progression

Difficulty has 4 knobs: **speed**, **pattern tier**, **reaction window**, and **hazard variety (world)**.

| Phase | Worlds | Tiers allowed | Min reaction window | Notes |
|---|---|---|---|---|
| Learn | 1 | 1 | 1.1 s | Single hazards with big gaps, lots of candy |
| Grow | 2 | 1 to 2 | 0.95 s | Gaps, hanging snakes, platforms |
| Mix | 3 | 1 to 3 | 0.85 s | Spiky slime, surprise blocks, simple combos |
| Challenge | 4 | 2 to 4 | 0.75 s | Snake pairs, night |
| Storm | 5 | 2 to 4 | 0.68 s | Hopping slimes, moving platforms |
| Master | 6 | 3 to 5 | 0.62 s | Everything |
| Lap 2+ | 1 to 6 | +1 tier, max 5 | × 0.95 per lap, floor 0.55 s | |
| Nubecita | 1 to 6 (visuals) | 1 only, no gaps, no spiky slime hop | 1.4 s | Every hazard is a single, telegraphed obstacle |

**Reaction window** = horizontal distance between the end of one required action and the start of the next one, divided by the current speed. The generator enforces it at chunk joins (section 38).

**Breathers:** after any tier 4 or 5 chunk, the next chunk is tier 1 or a candy-only chunk. After a hit, the next 2 s of travel spawn no hazards.

---

## 13. Procedural pattern system

Levels are built from **authored chunks**, never from random hazard placement.

### 13.1 Chunk format (JSON, `src/data/patterns/*.json`)

```json
{
  "id": "combo_snake_slime_01",
  "tier": 3,
  "worlds": [3, 4, 5, 6],
  "modes": ["normal"],
  "lengthTiles": 28,
  "minSpeed": 170,
  "maxSpeed": 330,
  "weight": 3,
  "cooldownChunks": 4,
  "tags": ["crouch", "jump", "combo"],
  "entry": "ground",
  "exit": "ground",
  "floor": [[0, 28]],
  "items": [
    { "type": "snake_fly", "x": 6 },
    { "type": "slime_flat", "x": 17 },
    { "type": "candy_formation", "shape": "crouch_tunnel", "x": 4, "count": 5 },
    { "type": "candy_formation", "shape": "stomp_reward", "x": 17 }
  ],
  "safePath": "crouch@5..9, jump@15",
  "notes": "Duck the snake, then jump or stomp the slime."
}
```

- `x` is in tiles (16 px) from the chunk start. `y` is optional and given in tiles above the floor.
- `floor` is a list of solid floor spans `[startTile, endTile]`. Missing spans are gaps.
- `safePath` is documentation for humans. The validator proves it.

### 13.2 Starting library (minimum 44 chunks)

| Group | Chunks |
|---|---|
| Breathers (tier 1) | `breather_candy_line_01..03`, `breather_empty_01`, `breather_wave_01` |
| Easy jump | `easy_slime_01..04` |
| Easy crouch | `easy_snakefly_01..03` |
| Hanging snake | `hang_01..03` |
| Stomp | `stomp_single_01`, `stomp_chain_02` (2 slimes spaced for a chain), `stomp_chain_03` |
| Gaps | `gap_small_01..02`, `gap_wide_01`, `gap_platform_01` (cloud platform over a gap) |
| Platforms | `platform_high_candy_01..02`, `platform_steps_01` |
| Spiky | `spiky_01..02`, `spiky_double_01` |
| Surprise block | `block_single_01`, `block_row_01` |
| Combos | `combo_snake_slime_01..02`, `combo_slime_snake_01`, `combo_hang_gap_01`, `combo_pair_snakes_01` |
| Risk/reward | `risk_power_over_slime_01`, `risk_zigzag_01`, `risk_high_path_01` |
| Storm (World 5+) | `hop_spiky_01..02`, `moving_platform_01` |
| Master (World 6) | `master_gauntlet_01..03` |
| Power sprint | `sprint_candy_rain_01..03` (only during FAST) |
| Nubecita | `soft_slime_01..03`, `soft_snake_01..03`, `soft_candy_01..03` |

### 13.3 Validator (mandatory)

`tools/validate_patterns.mjs` imports the real physics core and, for each chunk, at `minSpeed`, `maxSpeed` and 3 speeds in between:
1. Runs a search over input timelines (actions every 2 ticks: none, tap-jump, hold-jump for N ticks, crouch, release) to find at least one path with zero hits.
2. Checks that every power candy is reachable without a hit.
3. Checks that every chunk is solvable starting from any legal exit state of any chunk it can follow.
4. Fails the build (non-zero exit) on any unsolvable chunk, and prints the chunk id and speed.

---

## 14. World design

The play space, bottom to top (internal pixels, `H` is the dynamic internal height, at least 216):

| Band | y range | Content |
|---|---|---|
| Floor | `H-40` to `H` | Cloud floor tiles (16x16), 2.5 rows visible |
| Ground lane | `H-80` to `H-40` | Slimes, flying snakes, caramelito lines |
| Jump lane | `H-130` to `H-80` | Arcs, power candies, hanging snake heads |
| Platform lane | `H-150` to `H-110` | Cloud platforms, surprise blocks |
| Sky | `0` to `H-150` | Background only, plus the HUD |

Readability rules (MUST):
- Gameplay sprites: 1 px outline `#1E1330`, saturated colors, full contrast.
- Background layers: **no outlines**, lower saturation, and lightness kept at least 25 L* units away from enemies and candies.
- Nothing in the background uses the enemy lime ramp or the candy red/emerald.
- Foreground particles never cross the ground lane at more than 40% opacity.

---

## 15. Biome plan (the 6 worlds)

All six share the same sky-and-clouds DNA from Sophie's drawing, so they read as one universe traveling toward the yellow light. Each world adds **one** new mechanic and **one** new visual signature.

| # | Name (ES / EN) | Sky | Clouds and props | Ambient FX | New mechanic | Music variation |
|---|---|---|---|---|---|---|
| 1 | **Nubes de Algodón** / Cotton Clouds | Sophie's lavender `#9C7FE0` with diagonal light streaks, yellow glow on the right | Big pink cotton clouds, pink cloudlets, pink cloud floor | Drifting cloud wisps | Flat slime, flying snake, stomp | Main theme in C major, 140 BPM, pulse lead |
| 2 | **Valle Arcoíris** / Rainbow Valley | Lighter lilac to peach, rainbow arcs far away | Rainbow bridges, puffy white-pink clouds, small floating islands | Rainbow sparkles | Gaps, hanging snakes, cloud platforms | Same theme in D major, 146 BPM, adds an arpeggio |
| 3 | **Bosque de Chupetas** / Lollipop Forest | Warm pink-orange | Giant swirl lollipop trees (yellow, from Sophie's lollipop), candy-cane posts, cookie hills | Floating sugar dust | Spiky slime, surprise blocks | F major, 150 BPM, marimba-like triangle lead |
| 4 | **Cielo Estrellado** / Starry Sky | Deep indigo to purple night | Dark-lavender clouds with lit edges, moon, constellations shaped like candies | Twinkling stars, shooting stars that leave caramelito lines | Snake pairs, night readability (enemies get a 1 px light rim) | A minor, 152 BPM, music box bells |
| 5 | **Tormenta Mágica** / Magic Storm | Purple-grey with pink lightning | Swirling storm clouds, candy raindrops | Rain particles, soft lightning flashes (off with "Reduce flashing"), gentle wind lines | Hopping spiky slime, moving platforms | E minor to G major, 156 BPM, driving drums |
| 6 | **Castillo Cósmico de Caramelo** / Cosmic Candy Castle | Space purple with planets that look like candies | Crystal candy towers, the castle on the horizon, glowing yellow light (Sophie's light) getting closer | Floating crystals, stardust | Everything at master tiers | Grand version of the theme in C major, 160 BPM, all layers |

**World transitions:** at a world end, a world gate passes (a rainbow arch in the parallax), then a Mario-style card slides in: "MUNDO 2 · Valle Arcoíris" with the unicorn icon and the lap number. Sky colors crossfade over 2 s while a breather chunk plays.

**Lap 2+:** the same worlds with a "twilight" palette shift (hue −8°, a bit darker) and a lap badge "Vuelta 2" in the HUD.

**Reduced scope fallback:** if credits or time run short, ship Worlds 1 to 3 as v1.0 and Worlds 4 to 6 as v1.1. The loop logic works with any number of worlds.

---

## 16. Art bible

**Style statement:** 16-bit era pixel art (SNES), Super Mario World-level clarity, built on Sophie's shapes and colors. Round, soft, candy shapes. Thick readable silhouettes. Happy faces. Bright pastel world with saturated characters on top.

Principles:
1. **Silhouette first.** Every gameplay sprite must be recognizable filled solid black.
2. **Sophie's shapes are canon.** We fix proportions and pixel quality. We never replace a shape she drew with a "better" one.
3. **One light source:** top left. Highlights top left, shadows bottom right, on everything.
4. **Two depths of detail:** gameplay layer detailed and outlined, background simple and soft.
5. **Cute over cool.** No sharp aggressive angles on enemies except the spiky slime's spikes, which are rounded at the tips.
6. **No text baked into sprites** except the logo.
7. **Inspiration, not copying:** take Mario's discipline (tile grid, palettes, chunky outlines, readable enemies, the joy of the stomp). Never copy Nintendo sprites, characters, music or sound.

---

## 17. Color and palette strategy

- One **master palette** of at most **48 colors**, stored in `tools/palette/unisalta.gpl` (GIMP format) and `src/data/palette.json`.
- Every sprite uses only master palette colors. The pixelize tool snaps every pixel to it (section 31).
- Each world adds a **world sub-palette** of at most 12 extra colors for sky and props only. Gameplay sprites never use world colors.
- Lap 2+ and night use hue-shift on background layers only, done in code (a Phaser color matrix on the background camera), never on gameplay sprites.

Core ramps (hex, light to dark):

| Ramp | Colors |
|---|---|
| Outline | `#1E1330` |
| Unicorn white | `#FFFFFF`, `#F1E8F7`, `#CDBCE3` |
| Mane pink | `#FFD3EA`, `#FF85C4`, `#E0529F`, `#A93379` |
| Gold (horn, lollipop, caramelito) | `#FFF7B0`, `#FFE23A`, `#FFCB2E`, `#FFA51F`, `#D98612` |
| Enemy lime | `#EEFF9A`, `#C8F03C`, `#93CC22`, `#5E9A14`, `#335A0C` |
| Candy emerald | `#BFF5CF`, `#6FE09A`, `#2FBF6A`, `#16834A` |
| Candy red | `#FFC2CB`, `#FF5C70`, `#E8173A`, `#A10A26` |
| Tongue pink | `#FF6F9A`, `#D63D6C` |
| Sky lavender (World 1) | `#D9CCF7`, `#B9A3EE`, `#9C7FE0`, `#7F63C9` |
| Cloud pink (World 1) | `#FFE6F3`, `#FFC2E0`, `#F79CCB`, `#D978AE` |
| Sun yellow (World 1) | `#FFF8C9`, `#FFEB7A` |
| UI cream (Sophie's button) | `#FFF4DC`, `#FFE2A8`, `#FFC46B`, `#E08A2E` |
| Rainbow | `#FF4D5E`, `#FF9A3C`, `#FFE23A`, `#5CD66A`, `#4DA6FF`, `#9D6BFF` |

---

## 18. Pixel-art production rules

| Rule | Value |
|---|---|
| Design safe area | **384 x 216** internal px (16:9) |
| Dynamic internal resolution | See section 43. Typical: 466x258 (iPhone 15 Pro Max), 468x216 (S23), 393x273 (iPad), 475x236 (desktop 1080p) |
| Scaling | Integer only, nearest neighbor, never filtered |
| Tile size | **16 x 16** |
| Unicorn cell | 48 x 48 |
| Enemy cells | 40x24, 32x32, 64x24, 32x32 (+16x16 segments) |
| Candy cells | 10x10 (coin), 16x16 (balls, heart), 16x24 (lollipop) |
| FX cells | 8x8, 16x16, 24x24, 32x32, 48x48 |
| UI | Built on an 8 px grid, 9-slice panels with 8x8 corners |
| Outline | 1 px `#1E1330` on all gameplay sprites. **Selective outline** allowed: the outline may take a darker shade of the fill on the lit side (top left) |
| Anti-aliasing | Not allowed on outer edges. Allowed **inside** shapes only, max 1 intermediate color, hand placed |
| Gradients | Not allowed in sprites. Sky gradients use ordered dithering (4x4 Bayer) between ramp colors |
| Pixel art sub-pixel motion | Sprites are drawn at integer positions (`roundPixels`). Smooth motion comes from the frames, not from sub-pixel rendering |
| Rotation and scaling of sprites | Not allowed in game (it breaks pixels), except: squash/stretch by **whole-pixel frame art**, and tiny particle rotation in 90° steps |
| Orphan pixels and jaggies | Not allowed. Lines follow clean 1:1, 1:2, 2:1 steps |
| Banding | Not allowed (parallel lines of equal length hugging the outline) |
| Max colors per sprite | 16 including outline |

---

## 19. Character animation plan

All unicorn animations use **48x48 cells**, pivot (24, 46), facing right. FPS is the base value. `run` scales with speed. Every animation is drawn frame by frame (hand-made or AI keyframes then hand-cleaned). No tween interpolation between frames.

| Anim key | Frames | FPS | Loop | Silhouette and pose | Secondary motion (mane, tail) | Horn | Face |
|---|---|---|---|---|---|---|---|
| `unicorn_idle` | 6 | 6 | Yes | Standing, slight lean back, one arm relaxed | Mane sways 1 px, tail swishes 2 px | Sparkle on frame 4 (random trigger) | Happy closed eyes, blink-free (eyes are already closed) |
| `unicorn_run` | 8 | 12 to 18 (`10 + speed/30`) | Yes | Two-leg run, body bobs 1 px on frames 2 and 6, arms pump opposite to legs | Mane flows back with 2-frame lag, 3 shapes. Tail bounces up on contact frames | Steady | Happy closed eyes, small open smile |
| `unicorn_run_fast` | 6 | 18 | Yes | Strong forward lean (≈15°), legs a blur arc, arms back | Mane straight back, tail streaming | Gold glow pixel ring, flickers | **Eyes open**, determined, big smile |
| `unicorn_jump_takeoff` | 1 | single tick (≈33 ms) | No | Squash: 2 px wider, 2 px shorter, legs bent, already off the floor | Mane compresses | n/a | Eyes closed, cheeks puffed |
| `unicorn_jump_rise` | 2 | 10 | Yes while rising | Stretched 2 px taller, arms up, legs tucked | Mane trails down and back | n/a | Open "o" happy mouth |
| `unicorn_jump_apex` | 2 | 8 | Hold | Round "ball" pose, arms out, the wave arm raised (Sophie's pose) | Mane floats up, tail curls | Twinkle | Happy closed eyes, big smile |
| `unicorn_fall` | 2 | 10 | Yes | Legs reach down, arms up | Mane and tail rise above the body | n/a | Happy, slightly surprised |
| `unicorn_land` | 3 | 20 | No | Squash 3 px, then 1 px, then normal | Mane bounces down then up | n/a | Eyes squeezed |
| `unicorn_crouch_enter` | 2 | 30 | No | Fast squash to crouch | Mane flattens | n/a | n/a |
| `unicorn_crouch_run` | 6 | 14 | Yes | Low "scoot": head forward, body low, tiny fast legs, ears back | Mane flat and streaming, tail low | Horn points forward | Eyes closed tight, playful |
| `unicorn_crouch_exit` | 2 | 30 | No | Pops back up | Mane springs up | n/a | n/a |
| `unicorn_fast_fall` | 2 | 12 | Yes | Cannonball, arms in | Mane straight up | n/a | Eyes closed tight |
| `unicorn_stomp` | 3 | 20 | No | Squash on the slime then spring | Mane whips | Sparkle | Big laugh |
| `unicorn_hit` | 3 | 15 | No | Recoil back, arms up, stars over the head | Mane frazzled (spiky pixels) | n/a | **Eyes open wide "O_O"**, small "o" mouth. Never pain. |
| `unicorn_invincible` | uses run frames | n/a | n/a | Same as run | Same | Horn flashes white | Same, plus a **palette-cycle shader** through the rainbow at 12 Hz (soft tint with "Reduce flashing") |
| `unicorn_slow` | uses run frames | run FPS × 0.6 | n/a | Same | Mane floats as if underwater | Green shimmer | Dreamy smile |
| `unicorn_celebrate` | 8 | 12 | No (plays once, 0.7 s) | **Sophie's wave**: hops, waves the right arm twice, lands | Mane bounces | Big sparkle | Huge closed-eye smile |
| `unicorn_tired` | 8 | 8 | Last 4 frames loop | Sits down on her bottom, tongue out, dizzy stars, then smiles and waves | Mane droops then perks up | Horn droops then sparkles | Spiral eyes, then happy closed eyes |
| `unicorn_title_fly` | 6 | 8 | Yes | **Sophie's title pose**: flying diagonally up-right, right arm waving, legs trailing | Mane and tail stream down-left in the wind | Sparkle every 2 s | Happy closed eyes, blush |
| `unicorn_ready` | 4 | 10 | No | At run start: looks at camera, opens eyes, nods | n/a | Sparkle | Eyes open, then close happily |
| `unicorn_respawn` | 2 | 6 | Yes | Sitting on the rescue cloud, waving | Gentle | n/a | Happy |

---

## 20. Enemy animation plan

| Anim key | Cell | Frames | FPS | Loop | Pivot | Description |
|---|---|---|---|---|---|---|
| `slime_flat_idle` | 40x24 | 4 | 8 | Yes | (20, 23) | Wobble: squash 1 px, stretch 1 px, highlight shifts |
| `slime_flat_lookup` | 40x24 | 2 | 8 | Hold | (20, 23) | Eyes roll up, mouth "o" |
| `slime_flat_stomped` | 40x24 | 5 | 20 | No | (20, 23) | Flatten into puddle, eyes spiral, 2 bubbles |
| `slime_flat_pop` | 40x24 | 5 | 24 | No | (20, 23) | Bursts into 3 caramelitos (invincible) |
| `slime_spiky_idle` | 32x32 | 4 | 8 | Yes | (16, 31) | Flame-like spikes sway, spiral eyes rotate |
| `slime_spiky_hop` | 32x32 | 6 | 12 | Yes | (16, 31) | Squash, jump, stretch, land |
| `slime_spiky_pop` | 32x32 | 5 | 24 | No | (16, 31) | Bursts |
| `snake_fly_slither` | 64x24 | 6 | 10 | Yes | (32, 12) | S-wave travels head to tail |
| `snake_fly_tongue` | 64x24 | 3 | 15 | No | (32, 12) | Overlay frames on the head, every 1.5 s |
| `snake_fly_lookdown` | 64x24 | 2 | 8 | Hold | (32, 12) | Eyes follow the crouching unicorn |
| `snake_fly_pop` | 64x24 | 5 | 24 | No | (32, 12) | Bursts into caramelitos, then a puff |
| `snake_hang_drop` | 32x32 head | 4 | 16 | No | (16, 0) top | The body unrolls down from the cloud |
| `snake_hang_sway` | 32x32 head | 6 | 6 | Yes | (16, 0) | ±2 px sway, eyebrows angry |
| `snake_hang_tongue` | 32x32 head | 3 | 15 | No | (16, 0) | Tongue flick |
| `snake_hang_pout` | 32x32 head | 2 | 8 | Hold | (16, 0) | Eyebrows relax into a pout after the unicorn passes |
| `snake_hang_pop` | 32x32 head | 5 | 24 | No | (16, 0) | Bursts |
| `cloud_anchor_wiggle` | 48x24 | 4 | 12 | No | (24, 12) | The warning wiggle before a snake drops |

---

## 21. FX animation plan

| FX key | Cell | Frames | FPS | Loop | Use |
|---|---|---|---|---|---|
| `fx_dust_run` | 8x8 | 3 | 15 | No | Small puff behind the feet every 4th run frame |
| `fx_dust_land` | 24x12 | 5 | 20 | No | Landing |
| `fx_puff_jump` | 16x8 | 4 | 20 | No | Takeoff |
| `fx_candy_sparkle` | 24x24 | 6 | 24 | No | Caramelito pickup |
| `fx_power_burst` | 48x48 | 7 | 24 | No | Power candy pickup, tinted by color |
| `fx_star` | 8x8 | 3 | 12 | Yes | Star particle (hit, invincible, celebration) |
| `fx_hit_burst` | 32x32 | 6 | 24 | No | Hit impact |
| `fx_stomp_ring` | 32x16 | 5 | 24 | No | Stomp shock ring |
| `fx_slow_ring` | 48x48 | 6 | 12 | No | Green pulse on SLOW start |
| `fx_speed_line` | 32x1 | 1 | n/a | n/a | Procedural speed lines (FAST) |
| `fx_invincible_aura` | 48x48 | 6 | 15 | Yes | Rainbow aura behind the unicorn |
| `fx_heart_get` | 24x24 | 6 | 20 | No | Heart pickup |
| `fx_perfect` | 48x16 | 6 | 20 | No | "¡Perfecto!" word burst (localized: two sprite variants) |
| `fx_bubble` | 6x6 | 3 | 10 | No | Slime bubbles |
| `fx_rain_drop` | 4x8 | 2 | 12 | Yes | World 5 |
| `fx_twinkle` | 5x5 | 4 | 8 | Yes | World 4 stars, horn sparkle |

**Rainbow trail** (procedural, not a sprite): a ribbon of 6 bands, 1 px each (the rainbow ramp), drawn from the last 24 player positions sampled every 2 ticks, snapped to integer pixels, scrolling left with the world. Off when crouching, thin (3 bands) when running normally, full 6 bands during FAST and INVINCIBLE, sparkle pixels during INVINCIBLE.

---

## 22. Sprite-sheet plan

### 22.1 Format

- **One horizontal PNG strip per animation**, fixed cell size, no padding, transparent background, PNG-8 indexed with the master palette where possible.
- File name = animation key: `unicorn_run.png`. Frame `n` is cell `n-1`.
- Frame-level source files use `<anim>_<NN>.png` (for example `unicorn_run_01.png`) inside `art-src/`. The strip builder assembles them.
- Each strip has a sidecar in `src/data/anims.json`:

```json
"unicorn_run": { "cell": [48, 48], "frames": 8, "fps": 12, "loop": true, "pivot": [24, 46],
                 "hitbox": "standing", "fpsBySpeed": true }
```

### 22.2 Hitboxes

Hitboxes live in `src/data/hitboxes.json`, **not** in the art. They are per state, not per frame (simple and fair):

| Name | Box (x, y, w, h) relative to pivot |
|---|---|
| `standing` | (-8, -28, 16, 28) |
| `air` | (-8, -26, 16, 24) |
| `crouch` | (-11, -16, 22, 16) |
| `slime_flat` | (-15, -14, 30, 14) |
| `slime_spiky` | (-10, -22, 20, 22) |
| `snake_fly_head` | (16, -5, 14, 9) |
| `snake_fly_body` | (-24, -4, 40, 8) |
| `snake_hang_head` | (-8, 10, 16, 12) |
| `snake_hang_body` | (-4, 0, 8, length) |
| Candy pickups | circles, radius from section 9 |

### 22.3 Sheet list

| Group | Sheets |
|---|---|
| Unicorn | 21 strips from section 19 (invincible/slow reuse run) |
| Enemies | 17 strips from section 20 |
| Candy | `candy_coin_spin` (4f, 12 fps), `candy_fast_shine` (6f, 10 fps), `candy_slow_shine` (6f), `candy_inv_shine` (6f), `heart_beat` (4f, 6 fps) |
| FX | 16 strips from section 21 |
| Props | `block_star_idle` (4f), `block_star_hit` (4f), `block_star_empty` (1f), `rescue_cloud` (4f), `world_gate_arch` (1f per world) |
| Tiles | one 16x16 tileset per world (`tiles_w1.png` …), 8 columns, includes floor top, floor fill, floor edges for gaps, platform pieces |
| UI | `ui_heart` (full/half/empty, 3f), `ui_power_icons` (3f), `ui_panel_9slice`, `ui_button_9slice` (normal, hover, pressed), `font_pixel` (bitmap font sheet) |

---

## 23. Background and parallax plan

Seven layers per world. Speeds are a fraction of world speed.

| # | Layer | Parallax | Source | Notes |
|---|---|---|---|---|
| L1 | Sky gradient | 0 | **Code**: dithered vertical gradient from the world sub-palette, drawn once to a texture | Diagonal light streaks added as a second static texture, see L2 |
| L2 | Light streaks and sun glow | 0.02 | Code-drawn diagonal pixel streaks (Sophie's scribbles) + sun glow at the right edge | The glow is Sophie's yellow light |
| L3 | Far clouds/props | 0.12 | Prop kit sprites, placed procedurally | Lowest contrast |
| L4 | Mid clouds/props (big pink clouds) | 0.3 | Prop kit | Sophie's big pink clouds |
| L5 | Near props | 0.55 | Prop kit | Lollipop trees, crystals, castle |
| L6 | Gameplay floor and platforms | 1.0 | Tileset | Floor top has a soft cloud edge |
| L7 | Foreground particles and speed FX | 1.2 to 1.5 | Particles | Low opacity, never over the ground lane above 40% |

- **Kit-based, not panorama:** each world gets a **prop kit** (8 to 14 separate sprites) that the background system places procedurally with seeded randomness and spacing rules. This makes infinite tiling trivial and avoids AI panoramas that never tile.
- Props wrap around when they leave the screen and get re-rolled.
- "Smiling cloud" delight: 1 in 40 L4 clouds uses the smiling variant.

---

## 24. UI/UX plan

### 24.1 Architecture

- The game canvas (Phaser) renders the world, characters, FX and in-world numbers.
- A **DOM overlay** (`#ui`) on top renders menus, HUD and transitions, animated with **Motion**.
- The DOM overlay uses CSS variable `--px` = CSS pixels per internal pixel, so DOM UI lines up with game pixels. All UI sizes are multiples of `--px`.
- UI art (panels, buttons, hearts) is pixel PNG used as CSS `border-image` (9-slice) with `image-rendering: pixelated`.
- Font: **Pixelify Sans** (OFL), self-hosted in `assets/fonts/`. It MUST render á é í ó ú ñ ¡ ¿. Verify in Phase 1. Fallback: a custom bitmap font as images.

### 24.2 HUD (during play)

```
[♥♥♥]   [⚡ ring timer]                 12,340   [II]
                                          823 m
```

- Top left: hearts (16x16 each, 4 px gap). In Nubecita: hearts are hidden, a caramelito counter shows instead.
- Top center: active power icon with a circular countdown ring (Motion animates the ring). Hidden when none.
- Top right: score (large) and meters (small below), then the pause button (24x24 touch target, at least 44 CSS px).
- The HUD stays inside `env(safe-area-inset-*)` (the iPhone Dynamic Island in landscape).
- Score bump: on every point change, the number scales 1.0 → 1.15 → 1.0 with a Motion spring (throttled to one bump per 120 ms).
- World/lap badge: shown for 3 s after a world card, then fades.

### 24.3 Screens

| Screen | Content | Motion |
|---|---|---|
| Rotate device | Unicorn icon turning, "Gira tu pantalla" / "Turn your screen" | Rotation loop, spring |
| Title | Section 25 | Section 25 |
| Mode select | Two big buttons: **Nubecita** (cloud icon, "fácil") and **Arcoíris** (rainbow icon, "normal"). Last choice is remembered | Buttons pop in with `stagger(0.08)`, spring bounce |
| World card | "MUNDO 3" + world name + mini art + lap badge | Slide in from the right, overshoot spring, out to the left |
| Pause | Continue (big), Restart, Settings, Menu, (Nubecita: Terminar) | Panel drops in with a spring, the background dims to 50% |
| Settings | Music, SFX, Voice volume sliders (pixel), Language ES/EN, Reduce shake, Reduce flashing, Touch hints, Reset records (hold 2 s) | Toggle knobs spring |
| Results / Game over | Section 26 | Section 26 |
| High scores | Top 5 per mode with date, best world | Rows stagger in |
| Gallery (unlock) | "Los dibujos de Sophie": the original references, with the game version next to each | Cards flip with Motion |

UX rules:
- Every button: minimum 44x44 CSS px, a hover state (desktop), a pressed state (scale 0.92 spring), a click SFX.
- Keyboard focus is visible (a pixel outline) and arrow keys move between buttons.
- Any screen can be left with Esc/back.
- Never more than 2 taps from the title to playing.

---

## 25. Start-screen plan

### 25.1 Landscape composition (384x216 safe area, scaled to the device)

- **Background:** Sophie's purple scribble sky: a dithered purple gradient with diagonal scribble streaks (two shades), drifting very slowly diagonally. Pink cloudlets drift at two parallax depths. Twinkling star pixels.
- **Rainbow:** a big pixel rainbow (Sophie's 5 bands + violet) enters from the **bottom-left corner** and curves up to the unicorn. It shimmers (a light band travels along it every 3 s).
- **Unicorn:** `unicorn_title_fly` at about 40% from the left and 45% from the top, flying up-right, floating ±3 px on a sine, waving.
- **Text:** top-left, Sophie's words typed out letter by letter: "al entrar..." (0.4 s), pause, "ya vas a jugar!" (0.5 s), then ". . ." with dots bouncing in a loop. English: "get ready..." / "you're about to play!".
- **Logo / start button:** right half, centered vertically: Sophie's **cream button with orange border saying "Uni-salta"**, made bigger. **It IS the play button.** It pulses (scale 1.0 to 1.04, 1.2 s, spring) and gets a sparkle that runs around its border.
- **Small buttons:** bottom-right: settings (gear), high scores (trophy), gallery (frame, once unlocked), language (ES/EN).
- Credit at the bottom-left, small: "Una idea de Sophie" / "An idea by Sophie".

### 25.2 Title interactions and delights

- Tapping the unicorn 5 times: she does a flip (6-frame special), squeaks, and drops a heart.
- Idle 20 s: she flies a loop-the-loop across the screen and comes back.
- Music: the title arrangement of the main theme (music box + soft pad) starts at the first tap (audio unlock). Before the first tap, a soft "Toca para empezar" / "Tap to start" prompt replaces the dots.

### 25.3 Title → gameplay transition (no hard cut)

1. Tap "Uni-salta": the button squashes (spring), chime SFX, the mode buttons pop out of it (Motion stagger). If a mode was chosen before, a third tap target "¡Jugar!" is focused.
2. Mode chosen: text and buttons fly out (Motion, 0.35 s). Voice: "¡Uni-salta!"
3. The unicorn flies off the top-right of the screen leaving the rainbow (Phaser tween 0.5 s).
4. The camera tilts **down** from the title sky into World 1 (Phaser camera pan 0.8 s, sky crossfades from title purple to World 1 lavender). The title is literally the sky above World 1.
5. The unicorn drops in from the top with a rainbow streak, lands with dust (`unicorn_land`), plays `unicorn_ready` and starts running.
6. World card "MUNDO 1 · Nubes de Algodón" slides in and out. Control is live from the moment she lands, and the first chunk is a breather.

Total: about 2.5 s, skippable by tapping (jumps to step 5).

---

## 26. Game-over flow

1. Last heart lost: hitstop 120 ms, music ducks with a low-pass, the world slows to a stop over 0.8 s (time-scale tween).
2. `unicorn_tired`: she sits, tongue out, dizzy stars. After 1 s she smiles and waves at the player (Sophie's wave). Never hurt, never crying.
3. Results panel slides up (Motion spring) with: title "¡Qué carrera!" / "What a run!", score count-up (Motion animates the number over 1.2 s with ticking SFX), meters, caramelitos, best world, best score.
4. **New record:** the panel flashes gold, confetti (DOM particles via Motion), fanfare, voice "¡Nuevo récord!", and the unicorn plays `unicorn_celebrate`.
5. Buttons: **"¡Otra vez!"** (huge, focused, Space/Enter/tap) and "Menú" (small). Replay restarts in under 1 s, directly into a running start (no title).
6. Encouragement line, random, localized: "¡Casi llegas al Mundo 3!" (if close), "¡Comiste 87 caramelitos!", and so on.

Modo Nubecita results are always a celebration: "¡Lo lograste!" with confetti every time.

---

## 27. Audio direction

**Sound identity:** "a music box that learned to run." Modern magical chiptune: NES-style pulse and triangle channels, plus soft bells, sparkly arpeggios, light percussion. Bright, major key, bouncy. Inspired by the joy of Mario soundtracks, but **all melodies are original**.

- Mix target: music −16 LUFS-ish feel, SFX on top, the voice always clearest (music ducks 4 dB under voice lines).
- Every sound is short and pleasant. No harsh noise, no scary sounds. Hits are "boing" and "oops", not pain.
- Voice: Sophie's recorded voice for key lines (section 29.3).

---

## 28. Music system

### 28.1 Engine

A small tracker-style sequencer in Web Audio (`src/audio/music/`):
- Channels: `pulse1` (lead, square with duty 12.5/25/50%), `pulse2` (harmony), `triangle` (bass), `noise` (drums), `bell` (sine + fast decay, for sparkles), `pad` (two detuned triangles with slow attack, title and SLOW only).
- Songs are **JS data**: patterns of steps (16th notes), note names, instrument per channel, BPM, key.
- Scheduler: the "two clocks" pattern (a 25 ms timer schedules notes 120 ms ahead on the AudioContext clock).
- **Layers** are channel groups with their own gain node: crossfades are scheduled on the **next bar line**, so they always sound musical.

### 28.2 Layers and adaptive rules

| Layer | Contents | When |
|---|---|---|
| L0 Base | Bass + drums | Always in play |
| L1 Harmony | pulse2 chords/arps | Always in play |
| L2 Melody | pulse1 lead | Always in play (ducked under voice) |
| L3 Speed | 16th hi-hats + octave arp on bell | FAST active, and permanently from World 5 |
| L4 Danger | Soft heartbeat kick on beats 1 and 3 + a tension note in the pad | 1 heart left (Arcoíris only). Gentle, never scary |
| INV | A separate short **"Arcoíris" theme** (180 BPM, 8 bars, looping) | INVINCIBLE, replaces L1/L2, back on the bar after |
| SLOW | Tempo × 0.8 (glide over 1 beat), low-pass at 1.2 kHz, pad on | SLOW active |

### 28.3 Song list

| Song | Key, BPM | Bars | Notes |
|---|---|---|---|
| `title` | C major, 96 | 16 loop | Music box + pad, the main motif slowly |
| `world1` … `world6` | Section 15 | 32 loop | Variations of the main motif, see section 15 |
| `invincible` | G major, 180 | 8 loop | Fast, happy, rainbow |
| `world_card` jingle | Key of the next world | 2 | "ta-da-da-DAA" |
| `world_clear` jingle | Current key | 3 | Mario flag feel, ascending |
| `game_over` sting | C major → F major | 3 | Cute descending "aww, again!" ending on a major chord |
| `new_record` fanfare | C major | 4 | Big and bright |
| `one_up` jingle | n/a | 1 | 6 rising bell notes |

### 28.4 Main motif (seed, Sonnet may refine)

"The jump motif": an ascending arpeggio that leaps like the unicorn, eighth notes in 4/4:

```
| C5 E5 G5 C6 . G5 E5 . | F5 A5 C6 A5 G5 . . . | E5 G5 C6 E6 D6 C6 . . | D6 . B5 . C6 . . . |
```

Every world song and the title song quote this motif in its first 4 bars, so the whole game feels like one piece.

---

## 29. SFX list

### 29.1 SFX (ZzFX, defined in `src/audio/sfx.js`)

| Key | Description (intent for tuning) |
|---|---|
| `jump` | Short rising "bwip", pitch up 1 octave over 80 ms. Slight random pitch ±3% |
| `jump_high` | `jump` with a longer tail, plays when the hold reaches full height |
| `land` | Soft "puff" (filtered noise, 60 ms) |
| `crouch` | Quick "fwip" downward |
| `fast_fall` | Descending whistle |
| `stomp` | "Boing" with pitch rising per chain step (+2 semitones each) |
| `coin` | Bright 2-note "ding-ding" (E6 → B6), the classic coin feel, original pitches. Pitch rises within a formation (+1 semitone per coin, resets after 0.6 s) |
| `perfect` | 4-note sparkle arpeggio |
| `candy_yellow` | Zippy rising sweep + "zoom" |
| `candy_green` | Soft descending "wooo" with vibrato |
| `candy_red` | Power chord sparkle burst |
| `power_end_warn` | 3 soft ticks |
| `power_end` | Short down-sweep |
| `heart` | Warm 3-note rising bell |
| `hit` | "Boing-oops": wobbly descending pitch, cartoony |
| `lose_heart` | Glassy "plink" |
| `fall_gap` | Slide whistle down |
| `rescue_cloud` | Puffy pop + chime |
| `snake_hiss` | Very soft, cute "tssss" when a snake drops (not scary) |
| `snake_tongue` | Tiny "blep" |
| `slime_blub` | Wet bubbly "blub" |
| `slime_hop` | "Boing" small |
| `enemy_pop` | Bubble pop + mini sparkle |
| `block_hit` | Wooden "tok" + sparkle |
| `world_gate` | Whoosh + chime |
| `ui_hover` | Tiny tick |
| `ui_press` | Soft "pop" |
| `ui_back` | Lower "pop" |
| `ui_toggle` | Click |
| `start_game` | Shimmering rise |
| `count_tick` | Very short tick for the score count-up |
| `new_record` | Uses the fanfare song |
| `typewriter` | Soft keyboard blips on the title text |
| `secret` | Magical twinkle |

### 29.2 SFX rules

- Max 12 simultaneous SFX voices. Repeated SFX within 40 ms are merged.
- Pitch variance ±3% on frequent sounds (`jump`, `land`, `coin`) to avoid repetition fatigue.

### 29.3 Voice lines (recorded by Sophie, ES and EN)

| Key | Spanish | English |
|---|---|---|
| `vo_title` | "¡Uni-salta!" | "Uni-salta!" |
| `vo_ready` | "¿Lista? ¡Vamos!" | "Ready? Let's go!" |
| `vo_world_1..6` | "¡Mundo uno!" … "¡Mundo seis!" | "World one!" … "World six!" |
| `vo_fast` | "¡Súper rápido!" | "Super fast!" |
| `vo_slow` | "Despaaacio…" | "Sloooow…" |
| `vo_inv` | "¡Arcoíris!" | "Rainbow!" |
| `vo_perfect` | "¡Perfecto!" | "Perfect!" |
| `vo_ouch` | "¡Ay!" | "Oops!" |
| `vo_heart` | "¡Una vida más!" | "Extra life!" |
| `vo_record` | "¡Nuevo récord!" | "New record!" |
| `vo_again` | "¡Otra vez!" | "Again!" |
| `vo_lap` | "¡Otra vuelta!" | "Another lap!" |
| `vo_bye` | "¡Chao!" | "Bye-bye!" |

Recording guide for Rick (Phase 13): phone voice memo, quiet room, 20 cm from the phone, each line 3 times, a 1 s pause between takes. Rick can also record lines in Alana's voice for Modo Nubecita (optional). Fallback: Higgsfield TTS (`seed_audio`, a cheerful young female preset voice), about 30 short lines.

Voice line rules: a voice line plays at most every 4 s, power lines have priority, and a "Voice" volume slider plus an off switch exist in settings.

---

## 30. Higgsfield workflow

### 30.1 What Higgsfield is used for, and what it is not

| Use Higgsfield | Do NOT use Higgsfield |
|---|---|
| Unicorn model sheet and key poses (consistency anchor) | Final sprites without cleanup (AI pixel art never sits on a true grid) |
| Unicorn animation sequences via **AutoSprite** (character image to sprite sheet) | Candies (the references are already clean, only a downscale is needed) |
| Snake side-view variants and slither via AutoSprite (non-humanoid) | Sky gradients and light streaks (code does it better) |
| World prop kits (6 worlds) | Music and SFX (not available for standalone use, and code is better for adaptive layers) |
| World tilesets (first draft) | UI panels and buttons (simple, hand-pixel or code) |
| Title key art reference and the logo lettering | The rainbow trail and particles (procedural) |
| PWA icon and share image | |
| Voice TTS only as fallback | |

### 30.2 Models (checked in the planning phase)

| Model id | Use | Cost seen at planning time |
|---|---|---|
| `gpt_image_2_5` | Default image generation and edits from references, good at following layout | **0.25 credits** per 16:9 image |
| `nano_banana_pro` | Final hero model sheet if gpt_image_2_5 drifts. Strong with reference images | **2 credits** per 2K image |
| `autosprite` | Animate one character image into a sprite sheet. Params: `kind` (idle, walk, run, jump, custom + name and prompt), `frame_count` 2 to 64, `frame_size` 32 to 512, `video_tier` turbo/pro/max, `remove_bg`, `is_humanoid` | **Unknown**: the cost preflight failed without a media input. Preflight with `get_cost: true` after uploading the master image, before the first real run |
| `seed_audio` | TTS voice fallback | Preflight before use |

**Rules for every generation (MUST):**
1. Preflight every call with `get_cost: true` and log it to `uni-salta/docs/CREDITS.md` (date, model, purpose, cost, running total).
2. Never exceed the phase budget (section 30.5) without asking Rick.
3. Never use `use_unlim` unless Rick says so.
4. Upload the references once (`media_upload`) and reuse the media ids, which are logged in `docs/CREDITS.md`.
5. Save every output that is used into `art-src/higgsfield/<category>/` with a sidecar `.json` holding the prompt, model, params, job id and cost.

### 30.3 Shared prompt blocks

**STYLE block** (append to every image prompt):
> 16-bit pixel art in the clean style of classic SNES platformers. Hard square pixels, a visible pixel grid, no anti-aliasing on the outer edge, 1-pixel dark plum outline (#1E1330), flat cel shading with one highlight and one shadow step, light from the top left, limited palette, cute and round shapes, cheerful. No blur, no gradients, no text, no watermark.

**BACKGROUND block** (for sprites):
> Single subject, centered, full body visible, on a perfectly flat solid #00FFFF cyan background with nothing else.

Cyan is the chroma key because no game sprite uses cyan.

**IDENTITY block:** the identity lock text from section 7.1.

### 30.4 Generation categories

**H1. Unicorn master model sheet**
- INPUT: `ref_unicorn.png`, `ref_title_screen.webp` (uploaded media ids).
- REFERENCE IMAGE: both, role `image_references`.
- GOAL: one canonical design of the cat-unicorn in game proportions (section 7.2), to anchor every later generation.
- STYLE: STYLE block + IDENTITY block.
- CAMERA: orthographic side view, character facing right, plus front view and back-3/4 on the same sheet.
- POSE: neutral standing (side), standing (front), mid-run (side).
- MOTION: none.
- OUTPUT: `gpt_image_2_5`, 16:9, up to 3 variants. If identity drifts after 2 tries, one `nano_banana_pro` 2K.
- POST-PROCESSING: crop each view, `pixelize.py` to a 48x48 cell, palette snap, outline pass, manual pixel fixes.
- CONSISTENCY CHECK: the checklist in section 48, items V1 to V8. **Approval gate: Rick shows the cleaned 48x48 side view to Sophie. Her yes is required to continue.**

**H2. Unicorn key poses**
- INPUT: the approved master side view (uploaded as new media).
- REFERENCE IMAGE: master side view + `ref_unicorn.png`.
- GOAL: single-pose images for the non-cyclic animations: crouch, hit, apex (wave), tired sitting, celebrate wave, title fly, fast-run lean.
- STYLE: STYLE + IDENTITY + BACKGROUND blocks.
- CAMERA: side view facing right (title fly: 3/4 diagonal, like Sophie's drawing).
- POSE: one per image, described precisely using section 19.
- MOTION: n/a.
- OUTPUT: `gpt_image_2_5`, 1:1, 1 variant each (7 images).
- POST-PROCESSING: pixelize to 48x48, palette snap, align the pivot to the master, hand fixes.
- CONSISTENCY CHECK: overlay with the master at 50% opacity in the contact sheet. Head size within ±1 px, same horn, same mane shapes.

**H3. Unicorn animations (AutoSprite)**
- INPUT: the approved, cleaned master **upscaled ×8 with nearest neighbor** to 384x384 on cyan, uploaded as media.
- REFERENCE IMAGE: that image, role `image`.
- GOAL: motion keyframes for `run` (kind `run`), `idle` (kind `idle`), `jump` (kind `jump`), and custom: `crouch_run` ("low fast scoot with the head forward and ears back"), `celebrate` ("hop and wave the right arm twice").
- STYLE: inherits from the image.
- CAMERA: side, locked.
- POSE: from `kind`.
- MOTION: from `kind` and the custom prompt.
- OUTPUT: `frame_count` 12 to 16 (we pick the best 6 to 8), `frame_size` 128, `video_tier` turbo first, `remove_bg` default, `is_humanoid` true.
- POST-PROCESSING: select frames that match the timing plan, pixelize each to 48x48, align pivots (feet on a fixed baseline), redraw the mane/tail to follow the lag rules, check loop continuity.
- CONSISTENCY CHECK: an onion-skin GIF preview of each loop plus a contact sheet against the master. Reject frames where the head size, horn or face change.
- FALLBACK: if AutoSprite output drifts or cannot be cleaned, Sonnet builds the frames by hand from the master by moving body parts on the pixel grid with `tools/patch_pixels.py` (legs and arms are 2 px sticks, so this is feasible).

**H4. Snakes**
- INPUT: `ref_snake_hanging.png`, `ref_world_candy_clouds.webp`.
- GOAL: (a) the flying snake as a clean side view, (b) the hanging snake head without the side bump, (c) slither motion.
- STYLE: STYLE + BACKGROUND blocks + "a silly lime-green cartoon snake, glossy, cute, not scary".
- CAMERA: side for flying, front for hanging.
- POSE/MOTION: (a) and (b) via `gpt_image_2_5`. (c) AutoSprite `custom`, name `slither`, prompt "body waves in an S shape from head to tail, staying in place", `is_humanoid` false, `frame_count` 12, `frame_size` 128.
- OUTPUT and POST: pixelize to 64x24 and 32x32, palette snap to the lime ramp, hand-made tongue frames.
- CONSISTENCY: same lime ramp as the slimes, the same eye style as Sophie's.

**H5. Slimes**
- Primary path: **no Higgsfield.** Pixelize `ref_slime_flat.png` directly to 40x24, and the spiky slime crop from the world reference to 32x32, then hand-animate the wobble and squash.
- Optional: one `gpt_image_2_5` call per slime for a clean side view if the crop is too noisy.

**H6. World prop kits (one per world)**
- INPUT: `ref_world_candy_clouds.webp` (all worlds) + the World 1 kit once approved (Worlds 2 to 6, for consistency).
- GOAL: a sheet of 8 to 14 separate props on cyan, spaced apart, no overlaps.
- STYLE: STYLE block, but "**no outline**, soft pastel, background art" (background rule), plus the world's prop list from section 15.
- CAMERA: side view, flat.
- OUTPUT: `gpt_image_2_5`, 16:9, 1 to 2 variants per world.
- POST: auto-slice by connected components, pixelize each prop to a 16 px multiple, palette snap to the world sub-palette, contrast check against the gameplay ramps.
- CONSISTENCY: the same pixel density as the World 1 kit (prop pixel size checked automatically by `pixelize.py`).

**H7. World tilesets**
- INPUT: the world's prop kit.
- GOAL: a cloud floor top edge, floor fill, left and right gap edges, a 3-piece platform, all 16x16.
- OUTPUT: `gpt_image_2_5` 1:1 → pixelize to a 16x16 grid. **Expect heavy hand cleanup.** Tiles MUST tile seamlessly (checked by `tools/tile_check.py`, which renders 6x3 repeats).

**H8. Title key art and logo**
- INPUT: `ref_title_screen.webp`.
- GOAL: (a) a landscape key-art reference of Sophie's title for composition only, (b) the "Uni-salta" lettering in her cream button style.
- OUTPUT: `gpt_image_2_5` 16:9 for (a), 16:9 for (b) with the exact text "Uni-salta".
- POST: (a) is reference only, the real title is built from game assets. (b) pixelize to fit 160x48, hand-fix the letters on the grid.

**H9. Icons and share image**
- PWA icons 192/512 (the unicorn head on lavender), an Open Graph image 1200x630. `gpt_image_2_5`, or composed by code from the final sprites (preferred, free).

**H10. Voice fallback** (only if Sophie's recordings are not available): `seed_audio` with a cheerful preset voice, batch the lines with `generate_audio_batch`.

### 30.5 Credit budget

| Phase | Category | Estimate (credits) |
|---|---|---|
| 7 | H1 master: 3 to 6 × 0.25 + up to 2 × 2 | 2 to 6 |
| 7 | H2 key poses: 7 to 10 × 0.25 | 2 to 3 |
| 8 | H3 AutoSprite: 5 to 8 runs | **unknown, preflight** (estimate 15 to 40) |
| 6 | H4 snakes: 3 images + 1 AutoSprite | 1 + AutoSprite |
| 9, 14 | H6 prop kits: 6 worlds × 2 | 3 |
| 9, 14 | H7 tilesets: 6 worlds × 2 | 3 |
| 12 | H8 title + logo: 4 | 1 |
| | Retries buffer (+30%) | 8 to 15 |
| **Total** | | **≈ 35 to 75 credits** |

Rule: if AutoSprite preflight shows more than 6 credits per run, stop and ask Rick, and propose the hand-made fallback for the less important animations.

---

## 31. Asset-generation workflow (Higgsfield to game-ready pixels)

```
reference/ (never touched)
   │ media_upload
   ▼
Higgsfield generation ──► art-src/higgsfield/<cat>/<name>_v<k>.png + .json
   │
   ▼ tools/pixelize.py
 1. Chroma key the cyan background (tolerance-based), keep the alpha mask hard (0 or 255)
 2. Detect the effective pixel size of the AI image (block-size estimate by run lengths), or use the target size
 3. Downscale to the target cell by sampling the **center** of each block (not averaging)
 4. Snap every pixel to the nearest master-palette color (CIEDE2000 in Lab)
 5. Remove orphan pixels (a single pixel surrounded by 7+ pixels of one other color)
 6. Enforce the 1 px outline: recolor edge pixels to #1E1330, fill outline gaps
 7. Align the pivot: place the feet baseline at the cell pivot
   ▼
art-src/pixel/<anim>_<NN>.png   (48x48 etc.)
   │ manual fixes: tools/patch_pixels.py <file> <patch.json>
   ▼   (patch = list of {x, y, color} or named palette ids, kept in git so fixes are reproducible)
   │ tools/build_strip.py
   ▼
assets/sprites/<anim>.png  +  src/data/anims.json entry
   │ tools/contact_sheet.py  (all frames ×4 + onion-skin GIF ×4 + overlay with the master)
   ▼
docs/qa/<anim>_sheet.png, docs/qa/<anim>.gif   ← Sonnet opens these images to review them visually
```

Rules:
- `pixelize.py` is deterministic: the same input gives the same output.
- Manual fixes are always patch files, never hand-edited PNGs, so a regenerated input can be re-patched.
- `art-src/` is committed (it is small). `reference/` is read-only.

---

## 32. Asset naming convention

| Kind | Pattern | Example |
|---|---|---|
| Sprite strip | `<entity>_<anim>.png` | `unicorn_run.png`, `slime_flat_stomped.png` |
| Source frame | `<entity>_<anim>_<NN>.png` (01-based, 2 digits) | `unicorn_run_03.png` |
| Patch | `<entity>_<anim>_<NN>.patch.json` | `unicorn_run_03.patch.json` |
| Higgsfield raw | `<cat>_<subject>_v<k>.png` + `.json` | `h1_unicorn_master_v2.png` |
| Tiles | `tiles_w<N>.png` | `tiles_w3.png` |
| Props | `props_w<N>_<name>.png` | `props_w3_lollipop_tree_big.png` |
| Sky | generated at runtime, no file | |
| UI | `ui_<name>.png` | `ui_button_9slice.png` |
| FX | `fx_<name>.png` | `fx_dust_land.png` |
| Voice | `vo_<key>_<lang>.mp3` (and `.ogg`) | `vo_perfect_es.mp3` |
| Pattern | `<group>_<name>_<NN>` inside `patterns/<group>.json` | `stomp_chain_02` |
| Phaser anim key | `<entity>-<anim>` | `unicorn-run` |
| i18n key | `<screen>.<item>` | `title.typewriter1` |

All lowercase, snake_case, ASCII only.

---

## 33. Folder structure

```
uni-salta/
├── index.html                 # entry, loads Phaser + Motion from CDN, then src/main.js as a module
├── manifest.webmanifest       # PWA (landscape, fullscreen)
├── sw.js                      # service worker (offline after first load)
├── PLAN.md                    # this plan
├── README.md                  # how to run, play, test, deploy
├── reference/                 # Sophie's drawings. READ-ONLY. Never modified.
├── docs/
│   ├── DECISIONS.md           # deviations from the plan
│   ├── CREDITS.md             # Higgsfield credit log
│   ├── PLAYTEST.md            # playtest notes with Sophie and Alana
│   └── qa/                    # contact sheets, GIFs, screenshots
├── art-src/
│   ├── higgsfield/<category>/ # raw outputs + sidecar JSON
│   ├── pixel/                 # cleaned frames
│   └── patches/               # patch JSONs
├── assets/
│   ├── sprites/               # final strips
│   ├── tiles/
│   ├── props/w1..w6/
│   ├── ui/
│   ├── fonts/                 # Pixelify Sans woff2 + bitmap font
│   ├── audio/voice/
│   └── icons/
├── src/
│   ├── main.js                # boots Phaser + the UI layer
│   ├── config.js              # ALL tunable numbers
│   ├── core/                  # pure deterministic game logic (no Phaser, runs in Node)
│   │   ├── sim.js             # fixed-step world simulation
│   │   ├── physics.js         # player physics
│   │   ├── player.js          # player FSM
│   │   ├── entities.js        # enemy and item behaviors
│   │   ├── collision.js
│   │   ├── generator.js       # chunk selection and placement
│   │   ├── difficulty.js
│   │   ├── powers.js
│   │   ├── scoring.js
│   │   ├── rng.js             # seeded mulberry32
│   │   └── events.js          # event bus (core → view/audio/UI)
│   ├── view/                  # Phaser scenes and renderers
│   │   ├── scenes/Boot.js, Preload.js, Title.js, Game.js
│   │   ├── render/            # player, enemies, items, parallax, rainbow trail, fx
│   │   └── juice.js           # shake, hitstop, flashes
│   ├── ui/                    # DOM overlay + Motion
│   │   ├── ui.css
│   │   ├── hud.js
│   │   └── screens/           # title, mode, worldCard, pause, settings, results, scores, gallery, rotate
│   ├── audio/
│   │   ├── engine.js          # context, buses, unlock, iOS session
│   │   ├── sfx.js             # ZzFX definitions
│   │   ├── voice.js
│   │   └── music/             # sequencer.js, instruments.js, songs/*.js
│   ├── systems/
│   │   ├── input.js
│   │   ├── layout.js          # dynamic internal resolution and zoom
│   │   ├── save.js
│   │   ├── i18n.js
│   │   └── debug.js           # URL flags, overlay
│   ├── data/
│   │   ├── patterns/*.json
│   │   ├── worlds.json
│   │   ├── anims.json
│   │   ├── hitboxes.json
│   │   ├── palette.json
│   │   └── strings.es.json, strings.en.json
│   └── vendor/zzfx.js         # vendored MIT ZzFX (about 1 KB)
├── tools/                     # Python and Node tooling (not shipped to the player)
│   ├── palette/unisalta.gpl
│   ├── pixelize.py, patch_pixels.py, build_strip.py, contact_sheet.py, tile_check.py, slice_props.py, palette_check.py, build_font.py
│   ├── validate_patterns.mjs
│   └── bot_playtest.mjs       # headless balancing bot
└── tests/
    ├── unit/*.test.mjs        # node:test
    └── e2e/*.spec.mjs         # Playwright
```

---

## 34. Engine recommendation

| Criterion | Phaser 3.90 | Phaser 4.2 | PixiJS 8 | Godot 4 (web export) | Kaplay | Vanilla canvas |
|---|---|---|---|---|---|---|
| Performance (2D sprites, mobile) | Very good (WebGL batching) | Very good | Excellent (render only) | Good, heavier startup | OK | Good if hand-optimized |
| Pixel-art support | `pixelArt: true`, `roundPixels`, nearest filtering | Same | Manual setup | Excellent | OK | Manual |
| Animation (sprite strips) | Built-in | Built-in | Basic | Excellent | Built-in | Manual |
| Audio | Built-in (we use our own Web Audio) | Same | None | Good | Basic | Manual |
| Input (touch, keys, pad) | Built-in, multi-touch | Same | None (DOM) | Good | Good | Manual |
| Web deploy (static, CDN, no build) | **One script tag** | One script tag | Yes | Large WASM bundle (≈ 30+ MB), slow first load on phones, iOS quirks | Yes | Yes |
| Mobile potential | PWA now, Capacitor later | Same | Same | Native exports | PWA | PWA |
| Development complexity | Low | Low to medium (new API details) | Medium (build our own engine bits) | Medium (different workflow, editor-centric) | Low | High |
| Asset pipeline fit | Spritesheets as-is | Same | Same | Import step | Same | Same |
| Productivity of the coding agent | **Highest**: years of docs and examples in its knowledge | Lower: released April 2026, less reliable knowledge | Medium | Medium (GDScript, editor files) | Medium | Low |

**Recommendation: Phaser 3.90.0** (the final, stable v3), loaded from jsDelivr, pinned:
`https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js` (verified to respond at planning time).

Why not Godot: the web export is heavy for phones and iOS, and the editor-centric workflow is harder for an agent to drive. Why not Pixi: we would rebuild input, animation and scenes that Phaser already has. Why not Phaser 4 yet: the agent's knowledge of v4 is thinner, and nothing in this game needs v4 features. A move to v4 later is possible because the core logic is engine-free (P2).

**Motion:** `motion@14.0.0` from jsDelivr ESM (`https://cdn.jsdelivr.net/npm/motion@14.0.0/+esm`) for the DOM UI layer.
**ZzFX:** vendored copy (MIT) in `src/vendor/zzfx.js`, to avoid one more network dependency for a 1 KB file.

No bundler, no npm in the shipped game. Native ES modules. A local dev server is `python3 -m http.server` from `uni-salta/`.

---

## 35. Technical architecture

```
┌──────────────────────────── index.html ────────────────────────────┐
│  <canvas> (Phaser)                     <div id="ui"> (DOM + Motion) │
└─────────────────────────────────────────────────────────────────────┘
           ▲ draws                               ▲ updates
           │                                      │
   view/ (Phaser scenes,         events.js        ui/ (screens, HUD)
   renderers, juice)  ◄────── event bus ──────►  audio/ (sfx, music, voice)
           ▲                     ▲
           │ reads state         │ emits events
           └──────── core/ (pure deterministic simulation) ◄── systems/input.js
                                 ▲
                                 └── data/ (config, patterns, worlds)
```

Principles:
1. **core/ is pure.** No Phaser, no DOM, no `Math.random` (use `rng.js`), no `Date.now` (time comes in as ticks). It runs identically in the browser and in Node.
2. **Fixed timestep.** `sim.step()` runs at 60 Hz. The view interpolates positions between the last two states using the frame's alpha.
3. **One-way flow.** Input → core → events → view/UI/audio. The view never changes core state.
4. **Events, not polling, for feedback:** `jump`, `land`, `stomp`, `coin`, `perfect`, `power_start`, `power_end`, `hit`, `heart_lost`, `gap_fall`, `world_enter`, `world_clear`, `game_over`, `new_record`, and so on. Juice, audio and the HUD subscribe.
5. **Config-driven.** Every number in `config.js`. Every chunk, world and animation in `data/`.

Motion's role (**max use without fighting the engine**):
- Motion animates **everything in the DOM layer**: title typewriter and dot bounce, the logo button pulse and sparkle path, mode buttons (`stagger` + spring), world cards, pause panel, settings toggles, the HUD score bump, heart break, the power ring countdown, results panel and count-up, confetti, gallery card flips, the rotate-device prompt, button press feedback.
- Phaser tweens animate **inside the canvas** (camera, unicorn title flight, world crossfades). Motion does not touch canvas objects. This split keeps each library doing what it is best at.
- A shared `ui/motionPresets.js` defines the house springs: `pop` (stiffness 500, damping 22), `soft` (stiffness 220, damping 26), `bouncy` (stiffness 380, damping 14), and durations, so the whole UI moves with one personality.
- Respect `prefers-reduced-motion`: springs become short fades.

---

## 36. Entity/component architecture

A full ECS is overkill here. Use **plain data entities in pooled arrays** inside core:

```js
// core entity (plain object, pooled)
{ id, kind: 'slime_flat', x, y, vx, vy, state, stateTick, hitbox: 'slime_flat',
  alive: true, flags: { stompable: true, popOnInvincible: true } }
```

- Pools per kind (max active: 12 enemies, 80 caramelitos, 6 power items, 8 props per parallax layer).
- Behaviors are functions in `entities.js` keyed by `kind`: `update(e, ctx)`, `onPlayerTouch(e, ctx)`.
- View renderers keep a map `entity.id → Phaser.Sprite` and recycle sprites from their own pools.

---

## 37. Collision architecture

- **AABB vs AABB** for hazards, **circle vs AABB** for pickups, all in core, using the per-state boxes of section 22.2.
- Checked every tick after movement. With max speed 330 px/s at 60 Hz the step is 5.5 px, smaller than the thinnest hazard (8 px), so no tunneling. A swept check is still added for the player's vertical motion during fast-fall (up to 520 px/s → 8.7 px/tick).
- **Stomp rule:** the player hits a stompable enemy from above if `vy > 0` and the player's bottom on the previous tick was ≤ enemy top + 4 px. Otherwise it is a hit.
- **Forgiveness:** player hitboxes are about 70% of the visible body. Hazard hurtboxes are about 80% of the visible enemy. Pickup radii are larger than the art.
- **Floor:** floor spans from chunks become solid segments. The player stands on a floor if the feet are within 0 to 6 px above the floor top while falling (snap). Platforms are one-way (land from above only).
- **Gaps:** if the feet pass `H + 16`, the player has fallen.
- Debug flag `?hitboxes` draws all boxes.

---

## 38. Procedural generation architecture

```
generator.update(ctx):
  while (spawnCursorX < cameraRightX + LOOKAHEAD_PX):
      chunk = pickChunk(ctx)
      place(chunk, spawnCursorX)
      spawnCursorX += chunk.lengthTiles * 16
```

- `LOOKAHEAD_PX` = 2 screen widths, so entities exist before they are visible.
- **pickChunk:**
  1. Filter the library by world, mode, tier window (section 12), speed range, cooldown, and entry compatibility with the previous exit.
  2. Apply rules: a breather after tier ≥ 4, after a hit, at a world start and after a respawn. No two gap chunks in a row before World 4. Power sprint chunks only during FAST.
  3. Weighted random pick with `rng`.
  4. **Join check:** compute the reaction window between the last required action of the previous chunk and the first of the new one at the current speed. If it is below the minimum, insert empty floor tiles to meet it.
- **Power candy placement:** a scheduler decides when a power candy is due (section 9) and replaces one caramelito slot in the next chunk that has a `powerSlot` flag (chunks author `powerSlot` positions that the validator has proven safe).
- **World progress:** the generator tracks meters. At the world length it places a `world_gate` breather chunk and fires `world_clear`.
- **Determinism:** the same seed and inputs give the same run (replays and bug reports via `?seed=`).

---

## 39. State management

- `core/sim.js` owns the run state (`RunState`): tick, mode, world, lap, speed, player, entities, score, lives, power, rng state.
- `systems/save.js` owns the persistent profile (section 41).
- `ui/` owns only presentation state (which screen is open). It reads RunState through events and a read-only snapshot.
- App state machine (section 6.1) is a small explicit FSM in `main.js` with `enter/exit` hooks. Every transition is logged in debug mode.
- Pausing stops `sim.step` and suspends the music scheduler. `visibilitychange` (hidden) and window `blur` auto-pause.

---

## 40. Audio architecture

```
AudioContext
 └─ master (GainNode) ── DynamicsCompressor (gentle limiter) ── destination
     ├─ musicBus  (gain, low-pass filter for SLOW/duck)
     │    ├─ layer L0 … L4, INV (each a GainNode, crossfade on the bar)
     ├─ sfxBus    (gain)
     └─ voiceBus  (gain; ducks musicBus by 4 dB while playing)
```

- **Unlock:** create/resume the AudioContext on the first `pointerdown`/`keydown`. The title shows "Toca para empezar" until then.
- **iPhone silent switch:** set `navigator.audioSession.type = 'playback'` when available (Safari 17+), so the game is audible with the ring switch on silent. Document the behavior if unsupported.
- **Voice files:** short MP3 (and OGG for completeness), decoded to AudioBuffers at preload, at most about 400 KB total.
- **SFX:** ZzFX generates buffers at boot (cached), played through `sfxBus`.
- **Music:** generated live by the sequencer. Zero files.
- Volumes from settings map to the bus gains with a perceptual curve (`gain = v²`).

---

## 41. Save and high-score system

`localStorage` key `unisalta.v1`, JSON:

```json
{
  "version": 1,
  "settings": { "music": 0.8, "sfx": 0.9, "voice": 1.0, "lang": "es",
                "reduceShake": false, "reduceFlash": false, "touchHints": true,
                "lastMode": "normal" },
  "highScores": { "normal": [ { "score": 0, "meters": 0, "world": 1, "lap": 1, "date": "2026-10-03" } ],
                  "easy": [] },
  "stats": { "runs": 0, "candies": 0, "bestWorld": 1, "bestLap": 1, "stomps": 0 },
  "unlocks": { "gallery": false, "secretsSeen": [] }
}
```

- Every read and write wrapped in try/catch. If storage fails, the game works with in-memory defaults.
- Top 5 per mode. Writes happen at run end and on settings change only.
- A `version` field allows future migrations.
- Default language: Spanish unless `navigator.language` starts with `en`.

---

## 42. Input system

- `systems/input.js` maps raw input to **two logical buttons**: `jump` and `crouch`, each with `down`, `pressedThisTick`, `releasedThisTick`, plus `pause` and `confirm`.
- Sources: keyboard, pointer (each active pointer is assigned to a half at `pointerdown`; it keeps that half until `pointerup`, even if it slides), gamepad (polled).
- Input is sampled into the core **at the start of each tick**. Events between ticks are queued with timestamps, so a tap shorter than one tick is never lost.
- Buffers (`config.js`): jump buffer 130 ms, coyote 90 ms.
- Touch target is the whole canvas area. The pause button in the DOM stops event propagation.
- Prevent default on Space and arrows (page scroll), `contextmenu` on the canvas, and multi-touch zoom gestures.

---

## 43. Responsive layout

**Dynamic integer-zoom internal resolution** (`systems/layout.js`):

```
physW = innerWidth  * devicePixelRatio
physH = innerHeight * devicePixelRatio
zoom  = max(1, min(floor(physW / 384), floor(physH / 216)))
W     = min(640, floor(physW / zoom))     // internal width
H     = min(360, floor(physH / zoom))     // internal height
canvas: width = W, height = H
canvas CSS size: (W * zoom / dpr) x (H * zoom / dpr), centered; leftovers filled by the sky color
```

| Device (landscape) | Physical px | zoom | Internal W x H |
|---|---|---|---|
| iPhone 15 Pro Max | 2796 x 1290 | 5 | 559 x 258 |
| Galaxy S23 | 2340 x 1080 | 5 | 468 x 216 |
| iPad 10th gen | 2360 x 1640 | 6 | 393 x 273 |
| Desktop 1080p browser | ≈ 1903 x 945 | 4 | 475 x 236 |
| Laptop 1366 x 650 | 1366 x 650 | 3 | 455 x 216 |

(Browser chrome, the notch and safe areas reduce these a little. The formula recomputes on every resize.)

Rules:
- The **gameplay design** uses the 384x216 safe area. The floor is anchored to the bottom. Extra height becomes sky. Extra width becomes more look-ahead.
- The player is always at x = 80. Because W ≥ 384, the player always sees at least 304 px ahead, which is 0.92 s at max speed. Patterns are validated for that minimum.
- Never stretch, never non-integer scale. On odd sizes, the leftover pixels are letterbox filled with the sky color.
- **Portrait:** show the rotate overlay and pause. On Android, try `screen.orientation.lock('landscape')` after entering fullscreen.
- **Fullscreen:** Android and iPad: a fullscreen button on the title (Fullscreen API). iPhone: not supported by Safari, so the README explains "Add to Home Screen" (the PWA manifest has `display: fullscreen`, `orientation: landscape`).
- `viewport-fit=cover` and `env(safe-area-inset-*)` for the HUD.

---

## 44. Performance targets

| Metric | Target |
|---|---|
| Frame rate | 60 fps stable on iPad (2020+), iPhone 15 Pro Max, Galaxy S23. 120 Hz screens get interpolated smooth rendering |
| Frame time | Core sim < 1 ms per tick. Total JS < 6 ms per frame on the S23 |
| Initial download before the title is interactive | < 2.5 MB: Phaser min (≈ 1.2 MB raw, ≈ 340 KB gzipped) + Motion + World 1 assets |
| Time to title | < 3 s on 4G, < 1 s when cached by the service worker |
| World assets | Lazy-loaded one world ahead during play (each world < 400 KB) |
| Total game size | < 8 MB |
| Memory | < 150 MB JS heap |
| Draw calls | < 40 per frame (one texture per world for props via a runtime atlas, or Phaser's multi-texture batching) |
| GC | No allocations in the per-tick hot path (pools, reused vectors) |
| Restart | Game over → playing in < 1 s |
| Input latency | Input to visible jump ≤ 1 frame after the next tick |

---

## 45. Quality targets

- **Feel:** a new player understands the controls in under 10 seconds without reading anything.
- **Fairness:** zero unavoidable hits (the validator proves it). Zero hits that a playtester calls "unfair" in 20 runs.
- **Recognition:** Sophie recognizes the unicorn, snakes, slimes and candies without being told. (Phase gate with Sophie.)
- **Alana test:** Alana (4) plays Modo Nubecita for 3 minutes alone and wants to continue.
- **Sophie test:** Sophie reaches World 3 within 10 runs, and wants "one more" after a game over.
- **Visual:** every screen passes the visual QA checklist (section 48).
- **Audio:** every action has a sound, and nothing is annoying after 10 minutes (section 49).
- **Stability:** zero console errors during a 30-minute bot run.
- **Polish:** no hard cuts anywhere (every transition is animated), and the game survives rotation, backgrounding, and resizing at any moment.

---

## 46. Testing strategy

| Layer | Tool | What |
|---|---|---|
| Unit | `node --test tests/unit` | physics (jump heights, timings match the config), collision (stomp vs hit edge cases), scoring, powers stacking rules, generator (no tier violations, breather rules, determinism with a seed), save (corrupt JSON, storage unavailable), i18n (every key exists in both languages) |
| Pattern validation | `node tools/validate_patterns.mjs` | Every chunk solvable at every speed and every legal join (section 13.3). Runs in CI before every commit that touches patterns or physics |
| Bot playtest | `node tools/bot_playtest.mjs --runs 200 --mode normal` | A greedy bot with human-like reaction delay (250 ms) plays seeded runs headlessly through the real core. Reports: death causes histogram, average world reached, power usage, hits per chunk id. Used for balancing (section 47) |
| E2E smoke | Playwright (Chromium preinstalled at `/opt/pw-browsers`) | Loads the game, no console errors, title → play → pause → resume → game over → replay, with `?seed=1&autoplay=1`. Screenshots per world (`?world=N`) into `docs/qa/` |
| Device emulation | Playwright | iPhone 15 Pro Max landscape (932x430, dpr 3), Galaxy S23 landscape (780x360, dpr 3), iPad landscape (1180x820, dpr 2), desktop 1920x1080. Checks: internal resolution as in the table, integer zoom, HUD inside the safe area, the rotate overlay in portrait |
| Real devices | Rick | The protocol in `docs/PLAYTEST.md`: the iPad, the iPhone 15 Pro Max and the S23. Sound with the silent switch, touch with both thumbs, 10 minutes of play, heat and battery feel |
| Kid playtests | Rick with Sophie and Alana | Short sessions, observation notes (what confused them, where they smiled, where they quit) |

Debug URL flags (`systems/debug.js`): `?seed=N`, `?world=N`, `?lap=N`, `?mode=easy|normal`, `?god`, `?speed=N`, `?hitboxes`, `?fps`, `?autoplay`, `?power=fast|slow|inv`, `?skipTitle`.

---

## 47. Gameplay balancing strategy

1. **Greybox first** (Phase 3 to 5): balance with rectangles until the run feels good. Art does not fix bad feel.
2. **Numbers live in `config.js`**, with a debug panel (`?tune`) that edits them live (sliders for gravity, jump velocity, speeds, windows) and prints the result as JSON to paste back.
3. **Bot targets** (normal mode, 200 seeded runs, 250 ms reaction bot):
   - median world reached: 2 to 3
   - 90th percentile: World 5
   - no single chunk causes more than 8% of all hits
   - share of deaths from gaps < 35%
4. **Human targets** (section 45: Sophie and Alana tests).
5. **Tuning order:** jump feel → speed curve → reaction windows → chunk tiers → power frequency → scoring.
6. **Nubecita check:** the bot with a 500 ms reaction time must reach World 3 in Nubecita, taking hits but always continuing.
7. Every tuning change is logged in `docs/DECISIONS.md` with before/after bot stats.

---

## 48. Visual QA checklist

Character consistency (run for every unicorn asset):
- V1 Cat ears with pink inner ear, both visible in side view (the far ear 1 to 2 px behind).
- V2 Golden spiral horn centered on top, same shape in every frame.
- V3 Closed happy "^ ^" eyes (except where section 19 says open).
- V4 Pink blush stripes visible.
- V5 Cat "w" smile and tiny dark nose.
- V6 Pink mane behind the head and big pink tail, same colors from the master ramp.
- V7 Stick arms and legs, 2 px thick, runs on two legs.
- V8 Head size and position stable within ±1 px between frames (no "boiling").

Pixel quality (every sprite):
- V9 Only master palette colors (checked by `tools/palette_check.py`).
- V10 Hard alpha (0 or 255 only).
- V11 Continuous 1 px outline on gameplay sprites, no double outlines.
- V12 No orphan pixels, no jaggies, no banding.
- V13 Pivot correct: the feet do not slide or jitter during run loops.
- V14 Loops loop: the last frame flows into the first.

Scene readability:
- V15 Enemies and candies readable on every world background (screenshots per world, also viewed in grayscale).
- V16 The green candy is never confused with a slime (show the screenshot to Sophie: "what is this?").
- V17 The HUD never covers the ground lane or the jump lane.
- V18 Nothing important in the safe-area insets (Dynamic Island).
- V19 Integer scaling verified on all emulated devices (no blurry pixels).
- V20 No hard cuts between screens.

---

## 49. Audio QA checklist

- A1 Every event in section 29.1 has a sound and it fires once (no doubles).
- A2 No clipping on the master at maximum volume with music + 8 SFX + voice.
- A3 Music layers enter and leave on the bar, no clicks (gain ramps ≥ 10 ms).
- A4 SLOW tempo glide sounds smooth, and returns to tempo cleanly.
- A5 The INVINCIBLE theme starts and ends on the bar, and the world song resumes in the right place.
- A6 Voice ducking works, and voice lines never stack.
- A7 Audio unlock works on iOS Safari, Android Chrome and desktop.
- A8 iPhone with the silent switch on: behavior matches the README.
- A9 Pausing silences everything instantly, and resuming restores it.
- A10 Volume sliders and mute work and persist.
- A11 10 minutes of play: no sound is annoying (Rick's and Sophie's ears are the judges).
- A12 Backgrounding the tab stops audio, and returning does not blast it.

---

## 50. Implementation phases (overview)

| Phase | Name | Main output |
|---|---|---|
| 0 | Repository inspection and setup | Branch, folders, README skeleton |
| 1 | Technical foundation | index.html, layout, scenes, input, debug, tests running |
| 2 | Pixel pipeline tooling | pixelize, patch, strips, contact sheets, palette |
| 3 | Greybox core movement | Run, jump, crouch, fast-fall, floor, camera |
| 4 | Greybox hazards and lives | Slimes, snakes, stomp, gaps, hits, hearts, game over |
| 5 | Patterns, generator, difficulty, validator, Nubecita | Chunk library, validator green, bot |
| 6 | Candies, powers, scoring, HUD (placeholder art) | Full gameplay loop |
| **M1** | **Milestone "Primer salto"** | A complete greybox game, fun with rectangles |
| 7 | Candy and enemy art from references | Real candies, slimes, snakes |
| 8 | Unicorn master (Higgsfield H1, H2) + Sophie approval | The approved unicorn |
| 9 | Unicorn animations (H3 AutoSprite + cleanup) | All unicorn strips |
| 10 | World 1 art and parallax | Sophie's world, playable |
| **M2** | **Milestone "Es mi juego"** | Sophie recognizes everything |
| 11 | Juice and FX | Particles, shake, hitstop, rainbow trail |
| 12 | Audio engine, SFX, World 1 music | Sound everywhere |
| 13 | Title, menus, transitions, i18n | The full front end with Motion |
| 14 | Voice lines | Sophie's voice in the game |
| **M3** | **Milestone "Mágico"** | World 1 at release quality |
| 15a to 15e | Worlds 2 to 6 (one sub-phase each) | The full journey |
| 16 | Secrets, gallery, PWA, offline | Delights and installability |
| 17 | QA and balancing on devices and with the girls | Tuned game |
| 18 | Release | GitHub Pages, tag v1.0 |
| **M4** | **Milestone "Lanzamiento"** | Public link |

---

## 51. Dependency map

```
P0 ─► P1 ─┬─► P2 ───────────────► P7 ─► P8 ─► P9 ─┐
          │                         │              │
          └─► P3 ─► P4 ─► P5 ─► P6 ─┴──────────────┴─► P10 ─► P11 ─► P13 ─► P15a..e ─► P16 ─► P17 ─► P18
                                    │                          ▲      ▲
                                    └─► P12 (audio) ───────────┘      │
                                                         P14 (voice, needs Rick's recordings)
```

- P2 (tooling) and P3 to P6 (greybox) can be done in either order after P1. Do P3 to P6 first: they need no credits.
- P8 needs Higgsfield credits **and** Sophie's approval.
- P12 (audio) only needs the event bus from P6.
- P14 needs Rick to send recordings, so it can happen anytime after P12. If no recordings arrive by P17, use the TTS fallback.
- P15 worlds are sequential (each world kit uses the previous one as a consistency reference).

---

## 52. Milestone plan

| Milestone | Definition of done | Demo to Rick |
|---|---|---|
| **M1 Primer salto** | Greybox game with every mechanic of World 1 to 3, powers, scoring, hearts, game over, Nubecita, validator and bot green, 60 fps on the S23 in Chrome | Link + a 30 s screen recording via Playwright |
| **M2 Es mi juego** | The real unicorn, enemies, candies and World 1 art in the game. **Sophie approves.** | Rick plays it with Sophie |
| **M3 Mágico** | World 1 at release quality: juice, music, SFX, title, menus, transitions, voice (or placeholders), ES/EN | Full World 1 experience on the iPad |
| **M4 Lanzamiento** | 6 worlds, secrets, PWA, all QA checklists passed, GitHub Pages live | Public link on all 3 devices |

Rick and Sophie's feedback after each milestone goes into `docs/PLAYTEST.md` and can change the next phases.

---

## 53. Risks

| # | Risk | Likelihood | Impact |
|---|---|---|---|
| R1 | **Higgsfield balance is 0.76 credits.** The USD 10 Rick mentioned is not visible yet. Art phases are blocked until credits arrive | High (now) | High |
| R2 | AutoSprite output drifts from the character or cannot be cleaned to 48 px | Medium | High |
| R3 | AI pixel art is not on a true grid and looks "fake pixel" | High | Medium |
| R4 | Code-composed music sounds amateur | Medium | Medium |
| R5 | iOS Safari: audio unlock, silent switch, no fullscreen on iPhone, Dynamic Island | High | Medium |
| R6 | The green candy is confused with slimes | Medium | Medium |
| R7 | Scope (6 worlds, many animations) delays the moment the girls can play | High | High |
| R8 | The game is too hard for Sophie or too frustrating for Alana | Medium | High |
| R9 | Pixelify Sans lacks a glyph (ñ, ¿, ¡, accents) | Low | Low |
| R10 | GitHub Pages not enabled, or the repo layout breaks paths | Low | Low |
| R11 | Privacy: the repo is public and will contain the girls' names, Sophie's drawings and her voice | Medium | Medium |
| R12 | CDN outage or offline play (car trips) | Low | Medium |
| R13 | Performance on an older family tablet | Low | Medium |
| R14 | Phaser 3.90 is end-of-line | Low | Low |

---

## 54. Mitigation plan

| # | Mitigation |
|---|---|
| R1 | Do every credit-free phase first (P0 to P7, P11 to P13 partly). Before P8, check `balance`. If low, tell Rick exactly how many credits are needed (section 30.5) and continue with free phases. Log all spend in `docs/CREDITS.md` |
| R2 | Pre-check one AutoSprite turbo run on `run` only. If it fails the consistency check twice, switch to the hand-made fallback (move limbs on the grid with patches). The cat-unicorn's simple stick limbs make hand animation realistic |
| R3 | The pixelize pipeline (block-center sampling, palette snap, outline pass) plus mandatory patch review on contact sheets |
| R4 | Keep songs short (32 bars) and motif-based. Rick and Sophie listen at M3. Fallback: CC0 chiptune tracks from OpenGameArt (license checked and credited) for any song that does not land |
| R5 | `audioSession.type`, a gesture unlock, a PWA for fullscreen on iPhone, safe-area insets, all tested in emulation and then on Rick's devices |
| R6 | A sparkle halo, float bob, emerald vs lime, no face. QA item V16 asks Sophie directly |
| R7 | Milestones put a playable game in the girls' hands at M1 and M2. Worlds 4 to 6 can ship as v1.1 without blocking v1.0 |
| R8 | Validator, bot targets, Nubecita, and kid playtests at every milestone |
| R9 | Check glyphs in Phase 1. Fallback: the bitmap font |
| R10 | Relative paths only. Phase 18 checks Pages. Rick enables Pages in the repo settings (one click; instructions in the README) |
| R11 | **Rick decides before M4**: keep first names, or use "Una idea de S." and keep the voice files out of the public repo. Default until he decides: first names only, no last names, no photos |
| R12 | The service worker caches the CDN libraries and all assets after the first load |
| R13 | A "low effects" auto-mode: if the average frame time > 20 ms for 3 s, reduce particles and parallax layers |
| R14 | The engine-free core keeps a later move to Phaser 4 cheap |

---

## 55. Exact execution order for Sonnet 5.5

1. Read this whole plan once. Then read `reference/` images (open each one).
2. Execute section 56 phases strictly in order: 0, 1, 3, 4, 5, 6, (M1), 2, 7, 8, 9, 10, (M2), 11, 12, 13, 14, (M3), 15a to 15e, 16, 17, 18, (M4).
   - Note: Phase 2 (tooling) runs after M1 on purpose, so the girls get a playable greybox as early as possible.
3. One phase per branch-and-PR cycle (see 56.0). Never start a phase whose dependencies are not done.
4. At every phase end: run all validations listed for that phase, commit, push, and post a short summary to Rick in Spanish (what was done, a screenshot or GIF, what is next, any decision needed).
5. Stop and ask Rick when: credits are needed or would exceed a budget, Sophie's approval is needed, a decision in 0.2 must change, or a validation fails twice after fixing.

---

## 56. SONNET 5.5 EXECUTION BLUEPRINT

### 56.0 Working rules for every phase

- **Branching:** start each phase from the latest `main`: `git checkout -B claude/uni-salta-p<N> origin/main`. Commit small steps with clear messages. Push with `git push -u origin <branch>`. Open a PR to `main` only when Rick asks, or at milestones if Rick has said "open PRs at milestones."
- **Never modify `uni-salta/reference/`.** A test (`tests/unit/reference.test.mjs`) checks the SHA-256 of every reference file against `reference/CHECKSUMS.txt`.
- **Every number in `src/config.js`.** No magic numbers in logic.
- **Run before every commit:** `node --test tests/unit`, `node tools/validate_patterns.mjs` (from Phase 5), and the Playwright smoke (from Phase 1).
- **Visual self-review:** after any visual change, take Playwright screenshots into `docs/qa/` and open them with the Read tool to check them against section 48.
- **Report to Rick in Spanish**, short, with a screenshot or GIF.
- **Higgsfield:** preflight cost, log in `docs/CREDITS.md`, respect the phase budget, never `use_unlim` unless Rick says so.
- **Placeholders:** until real art exists, entities are colored rectangles with the right hitbox sizes, colored by role (player white, slime lime, snake green, candy by color). Placeholder art is never committed to `assets/`.

---

### PHASE 0 · Repository inspection and setup

- **OBJECTIVE:** a clean base to build on.
- **INPUT FILES:** the repo, `uni-salta/PLAN.md`, `uni-salta/reference/*`.
- **FILES TO CREATE:** `uni-salta/README.md` (skeleton), `uni-salta/docs/DECISIONS.md`, `docs/CREDITS.md` (with the planning-time balance: 0.76), `docs/PLAYTEST.md` (template), `reference/CHECKSUMS.txt`, `reference/README.md` (the inventory table from section 2.1), `.gitignore` entries for `node_modules/`, `test-results/`, `.DS_Store`, `__pycache__/`.
- **ASSETS REQUIRED:** none.
- **HIGGSFIELD TASKS:** none. (Optional: `balance` to update CREDITS.md. Free.)
- **CODE TASKS:** none.
- **VALIDATION:** `sha256sum reference/*` matches CHECKSUMS.txt. The existing root `index.html` (the older game) is untouched.
- **DONE CRITERIA:** branch pushed, folders exist, Rick informed.
- **DEPENDENCIES:** none.

---

### PHASE 1 · Technical foundation

- **OBJECTIVE:** an empty game that boots on every target device at the right pixel-perfect resolution, with input, debug flags and tests working.
- **INPUT FILES:** sections 33 to 35, 39, 42, 43, 46.
- **FILES TO CREATE:** `index.html`, `src/main.js`, `src/config.js`, `src/systems/layout.js`, `src/systems/input.js`, `src/systems/debug.js`, `src/systems/i18n.js`, `src/systems/save.js`, `src/core/rng.js`, `src/core/events.js`, `src/view/scenes/Boot.js`, `Preload.js`, `Title.js` (placeholder), `Game.js` (placeholder), `src/ui/ui.css`, `src/ui/motionPresets.js`, `src/ui/screens/rotate.js`, `src/data/strings.es.json`, `strings.en.json`, `assets/fonts/PixelifySans.woff2` (downloaded from Google Fonts, with its OFL license file), `tests/unit/layout.test.mjs`, `tests/unit/save.test.mjs`, `tests/unit/i18n.test.mjs`, `tests/unit/reference.test.mjs`, `tests/e2e/smoke.spec.mjs`, `tests/e2e/playwright.config.mjs`, a root `package.json` **inside `uni-salta/` used only for dev tooling** (Playwright), never loaded by the game.
- **ASSETS REQUIRED:** the font.
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:**
  1. `index.html`: viewport meta with `viewport-fit=cover`, `user-scalable=no`. Phaser 3.90.0 from jsDelivr (classic script). `src/main.js` as `type="module"`. `#game` and `#ui` containers. `touch-action: none` on body.
  2. Motion import in `src/ui/motionPresets.js`: `import { animate, spring, stagger } from "https://cdn.jsdelivr.net/npm/motion@14.0.0/+esm"`. Re-export with the house presets.
  3. `layout.js`: the formula from section 43, applies canvas size, CSS size, `--px` CSS variable, safe-area variables, and calls `game.scale.resize(W, H)` on resize and orientation change. Shows the rotate overlay in portrait.
  4. Phaser config: `type: Phaser.AUTO`, `pixelArt: true`, `roundPixels: true`, `antialias: false`, `scale.mode: Phaser.Scale.NONE`, `backgroundColor` = the World 1 sky.
  5. `input.js` per section 42.
  6. `debug.js`: parse every URL flag from section 46. An FPS meter with `?fps`.
  7. `save.js` per section 41 (with try/catch everywhere). `i18n.js` with `t(key, vars)`.
  8. Placeholder Title scene: shows "UNI-SALTA" text and "tap to start", goes to the Game scene, which shows a grey floor rectangle and the internal resolution in text.
- **VALIDATION:**
  - Unit tests: the layout formula gives the table values in section 43 exactly, save survives storage throwing, both languages have the same keys.
  - Playwright: the 4 device profiles load with no console errors. Screenshots show crisp pixels (check a 1 px line stays 1 internal pixel wide = `zoom/dpr` CSS px). Portrait shows the rotate overlay.
  - Glyph test page renders "áéíóú ñ ¡¿ ÁÉÍÓÚ Ñ" in Pixelify Sans (screenshot reviewed).
- **DONE CRITERIA:** the game boots on all 4 profiles, tests green, Rick can open it locally with `python3 -m http.server`.
- **DEPENDENCIES:** Phase 0.

---

### PHASE 3 · Greybox core movement

- **OBJECTIVE:** the unicorn rectangle runs, jumps (variable height), crouches and fast-falls with perfect feel on a scrolling floor.
- **INPUT FILES:** sections 5, 6.3, 35, 37.
- **FILES TO CREATE:** `src/core/sim.js`, `physics.js`, `player.js`, `collision.js`, `src/view/render/player.js` (rectangle with state colors), `src/view/render/floor.js`, `tests/unit/physics.test.mjs`, `tests/unit/player.test.mjs`.
- **ASSETS REQUIRED:** none.
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:**
  1. Fixed 60 Hz `sim.step(input)` with an accumulator in `Game.js`, and interpolated rendering.
  2. Physics per section 5: variable jump (released gravity), fall gravity, fast-fall, max fall, coyote time, jump buffer, crouch hitbox switch on the same tick.
  3. Player FSM per section 6.3 (states as data, with events emitted: `jump`, `land`, `crouch_start`, `crouch_end`, `fast_fall`).
  4. A flat infinite floor scrolling at World 1 speed.
  5. Debug overlay with `?hitboxes` and `?tune` sliders for gravity, jump velocity and speed.
- **VALIDATION:**
  - Unit: full jump apex = 79 ±2 px, short hop apex = 30 ±3 px, coyote and buffer windows work at their exact tick counts, crouch hitbox changes on the same tick.
  - Manual (Playwright GIF in `docs/qa/`): jump feel review.
- **DONE CRITERIA:** tests green. Jumping and crouching feel instant.
- **DEPENDENCIES:** Phase 1.

---

### PHASE 4 · Greybox hazards and lives

- **OBJECTIVE:** all hazards from section 3.2 as rectangles, with collisions, stomps, gaps, hits, hearts and game over.
- **INPUT FILES:** sections 8, 10, 37.
- **FILES TO CREATE:** `src/core/entities.js`, `src/view/render/enemies.js`, `src/view/juice.js` (hitstop and shake only, for now), `src/data/hitboxes.json`, `tests/unit/collision.test.mjs`.
- **ASSETS REQUIRED:** none.
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:**
  1. Entities: `slime_flat`, `slime_spiky` (+hop variant), `snake_fly`, `snake_hang` (with the drop trigger at 1.3 s and the cloud wiggle warning), floor gaps, cloud platforms (one-way), moving platforms, surprise block (hit from below).
  2. The stomp rule and chain counter. Spiky slime stomp = hit.
  3. Hearts, hit sequence (section 10: hitstop, invulnerability, no double hit), gap fall with the rescue cloud, last-heart → `dying` → GAME_OVER state with a placeholder results text and replay.
  4. Nubecita rules for hits (no heart loss, scatter 3 coins).
  5. A temporary hand-placed test course (a fixed list of hazards) for testing before the generator exists.
- **VALIDATION:** unit tests for stomp vs side hit at the boundary (±1 px), invulnerability blocks a second hit, the crouch clearance math from section 8.1 for both snakes, gap fall triggers. Playwright run of the test course with `?god` and without.
- **DONE CRITERIA:** every hazard behaves as specified, tests green.
- **DEPENDENCIES:** Phase 3.

---

### PHASE 5 · Patterns, generator, difficulty, validator, Nubecita

- **OBJECTIVE:** infinite, fair, varied runs through 6 (greybox) worlds.
- **INPUT FILES:** sections 12, 13, 15, 38.
- **FILES TO CREATE:** `src/core/generator.js`, `src/core/difficulty.js`, `src/data/patterns/*.json` (all 44+ chunks of section 13.2), `src/data/worlds.json` (6 worlds: name keys, length, speed range, tiers, mechanics allowed, palette ids), `tools/validate_patterns.mjs`, `tools/bot_playtest.mjs`, `tests/unit/generator.test.mjs`.
- **ASSETS REQUIRED:** none.
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:**
  1. Chunk loader and the selection rules of section 38, including join checks and breathers.
  2. World progression by meters, `world_clear` and `world_enter` events, laps, Lap 2+ multipliers.
  3. The validator (section 13.3) using the real core.
  4. The bot (section 46) with configurable reaction delay.
  5. Greybox world tint per world (background color only) so worlds are distinguishable.
- **VALIDATION:** the validator passes for every chunk. Generator tests: same seed gives the same sequence, no tier outside the window, breather after tier ≥ 4. Bot: report stored in `docs/qa/bot_p5.md`. Nubecita bot (500 ms) reaches World 3.
- **DONE CRITERIA:** validator and tests green, bot targets in section 47 roughly met (± one world).
- **DEPENDENCIES:** Phase 4.

---

### PHASE 6 · Candies, powers, scoring, HUD (placeholder art)

- **OBJECTIVE:** the complete gameplay loop, still with rectangles, plus the real DOM HUD with Motion.
- **INPUT FILES:** sections 9, 10, 11, 24.2.
- **FILES TO CREATE:** `src/core/powers.js`, `src/core/scoring.js`, `src/view/render/items.js`, `src/ui/hud.js`, `src/ui/screens/results.js` (basic), `src/ui/screens/pause.js` (basic), `tests/unit/powers.test.mjs`, `tests/unit/scoring.test.mjs`.
- **ASSETS REQUIRED:** none (CSS-drawn placeholder hearts allowed).
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:**
  1. Caramelitos and formations (section 9.1), "¡Perfecto!" detection, the perfect streak.
  2. FAST (with the candy-sprint generator mode), SLOW (world time scale, the player at 1.0), INVINCIBLE (enemy pop, rainbow bridge over gaps, blink warning), hearts (1-UP), replacement rules.
  3. Scoring table from section 11, high scores saved per mode.
  4. HUD per section 24.2 with Motion: score bump, heart break, power ring countdown, Nubecita counter.
  5. Pause (Esc/P/button, auto-pause on blur) and a basic results screen with replay under 1 s.
- **VALIDATION:** unit tests for every power rule and every scoring line. Playwright: `?power=fast|slow|inv` screenshots, the HUD inside safe areas on the iPhone profile.
- **DONE CRITERIA:** a full run from start to game over works with all systems.
- **DEPENDENCIES:** Phase 5.

---

### ★ MILESTONE M1 · "Primer salto"

- Record a 30 s Playwright video of a bot run (`docs/qa/m1.webm`) and a screenshot per world.
- Rick plays the greybox on his phone and the tablet (instructions in the README).
- Collect feedback in `docs/PLAYTEST.md`. Apply feel fixes before moving on.
- **Gate:** Rick says the greybox is fun.

---

### PHASE 2 · Pixel pipeline tooling

- **OBJECTIVE:** turn any image into clean, palette-true, game-ready pixel sprites, reproducibly.
- **INPUT FILES:** sections 17, 18, 22, 31, 32.
- **FILES TO CREATE:** `tools/palette/unisalta.gpl`, `src/data/palette.json`, `tools/pixelize.py`, `tools/patch_pixels.py`, `tools/build_strip.py`, `tools/contact_sheet.py`, `tools/tile_check.py`, `tools/slice_props.py`, `tools/palette_check.py`, `tools/build_font.py`, `tools/requirements.txt` (Pillow, numpy), `tests/tools/test_pixelize.py`.
- **ASSETS REQUIRED:** none new.
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:**
  1. `pixelize.py` with every step in section 31 (`--key-color`, `--target WxH`, `--palette`, `--outline`, `--pivot`).
  2. `patch_pixels.py` applies a patch JSON. `build_strip.py` assembles frames and writes the `anims.json` entry. `contact_sheet.py` makes ×4 sheets, onion-skin GIFs and master overlays.
  3. `palette_check.py` fails on any off-palette pixel or non-hard alpha.
  4. `build_font.py`: a small bitmap font for in-world numbers (digits, + x ¡ ! and the letters needed for "¡Perfecto!"/"Perfect!") from a text glyph grid.
- **VALIDATION:** run `pixelize.py` on `ref_candy_red.png` → 16x16. The output passes `palette_check.py`, and the contact sheet looks like Sophie's candy (reviewed visually). The same input twice gives byte-identical output.
- **DONE CRITERIA:** the tools work on all 4 candy references.
- **DEPENDENCIES:** Phase 1 (independent of 3 to 6).

---

### PHASE 7 · Candy and enemy art from references

- **OBJECTIVE:** the real candies, slimes and snakes in the game.
- **INPUT FILES:** `reference/ref_candy_*.png`, `ref_slime_flat.png`, `ref_snake_hanging.png`, `ref_world_candy_clouds.webp`, sections 8, 9, 20.
- **FILES TO CREATE:** `art-src/pixel/*`, `art-src/patches/*`, `assets/sprites/candy_*.png`, `slime_*.png`, `snake_*.png`, `heart_beat.png`, `cloud_anchor_wiggle.png`, entries in `anims.json`, contact sheets in `docs/qa/`.
- **ASSETS REQUIRED:** the references.
- **HIGGSFIELD TASKS:** H4 (snakes, about 1 credit + 1 AutoSprite run, **preflight and ask Rick if the AutoSprite cost is above 6**). H5 optional.
- **CODE TASKS:**
  1. Pixelize candies (coin 10x10, balls 16x16, lollipop 16x24), hand-animate the shine frames with patches.
  2. Slimes: pixelize, then hand-make the wobble, look-up, stomped and pop frames with patches.
  3. Snakes: H4, pixelize, remove the bump (D7), hand-make tongue and pout frames.
  4. Swap the rectangles for sprites in the view. Keep hitboxes from `hitboxes.json`.
- **VALIDATION:** section 48 items V9 to V16 for every strip. A side-by-side sheet "Sophie's drawing vs game sprite" for each asset in `docs/qa/sophie_vs_game.png`.
- **DONE CRITERIA:** all non-unicorn gameplay sprites are in, the checklist passes.
- **DEPENDENCIES:** Phase 2, Phase 6.

---

### PHASE 8 · Unicorn master + Sophie approval

- **OBJECTIVE:** the one canonical unicorn every frame will match.
- **INPUT FILES:** `ref_unicorn.png`, `ref_title_screen.webp`, sections 7, 30.4 H1 and H2.
- **FILES TO CREATE:** `art-src/higgsfield/h1/*`, `art-src/higgsfield/h2/*`, `art-src/pixel/unicorn_master_side.png`, `unicorn_master_front.png`, key-pose frames, `docs/qa/unicorn_master_review.png` (the master ×8 next to Sophie's drawing).
- **ASSETS REQUIRED:** credits (≈ 4 to 9).
- **HIGGSFIELD TASKS:** check `balance`. Upload the references. H1 (gpt_image_2_5 first, nano_banana_pro if needed). After approval, H2.
- **CODE TASKS:** pixelize, patch, review.
- **VALIDATION:** V1 to V8. **Approval gate:** send Rick `docs/qa/unicorn_master_review.png` and ask him to show it to Sophie. Do not continue to H2 or Phase 9 without her "yes" relayed by Rick. Iterate on her comments (her comments override this plan).
- **DONE CRITERIA:** an approved master + 7 key poses that pass V1 to V8.
- **DEPENDENCIES:** Phase 2. Credits available.

---

### PHASE 9 · Unicorn animations

- **OBJECTIVE:** every animation in section 19, clean and consistent.
- **INPUT FILES:** the approved master and key poses, section 19, section 30.4 H3.
- **FILES TO CREATE:** `art-src/higgsfield/h3/*`, `art-src/pixel/unicorn_*_NN.png`, patches, `assets/sprites/unicorn_*.png`, `anims.json` entries, GIFs in `docs/qa/`.
- **ASSETS REQUIRED:** credits (AutoSprite, preflight).
- **HIGGSFIELD TASKS:** H3, in this order: `run` (pilot run, judge quality and cost) → `idle` → `jump` → `crouch_run` (custom) → `celebrate` (custom). Stop after the pilot if it fails, and use the fallback.
- **CODE TASKS:**
  1. Frame selection and cleanup to the frame counts of section 19.
  2. Hand-made frames for: takeoff, land, crouch enter/exit, fast fall, stomp, hit, tired, title fly, ready, respawn (from key poses + patches).
  3. View: the animation state machine maps the player FSM to anim keys, `run` FPS scales with speed, invincible palette-cycle (a shader or tint fallback), slow afterimages.
- **VALIDATION:** V1 to V14 for every strip, GIF review, feet do not slide on the ground (pivot check in-game at 3 speeds).
- **DONE CRITERIA:** the real unicorn runs in the game, and all states show the right animation.
- **DEPENDENCIES:** Phase 8.

---

### PHASE 10 · World 1 art and parallax

- **OBJECTIVE:** Sophie's world, as a living parallax scene.
- **INPUT FILES:** `ref_world_candy_clouds.webp`, sections 14, 15 (World 1), 23, 30.4 H6 and H7.
- **FILES TO CREATE:** `src/view/render/parallax.js`, `src/view/render/sky.js` (dithered gradient + diagonal streaks + sun glow), `assets/props/w1/*`, `assets/tiles/tiles_w1.png`, `src/data/worlds.json` art fields, `docs/qa/world1_*.png`.
- **ASSETS REQUIRED:** credits (≈ 1).
- **HIGGSFIELD TASKS:** H6 for World 1 (prop kit), H7 for World 1 (tiles).
- **CODE TASKS:** the 7-layer system from section 23, procedural prop placement with spacing rules, the smiling-cloud variant, floor tiles including gap edges and platforms, the rescue cloud sprite.
- **VALIDATION:** V15, V17, V19. A grayscale screenshot shows enemies standing out. `tile_check.py` passes. 60 fps on the S23 profile with `?fps`.
- **DONE CRITERIA:** World 1 looks like a premium version of Sophie's drawing.
- **DEPENDENCIES:** Phase 9 (for final review with the real unicorn), Phase 2.

---

### ★ MILESTONE M2 · "Es mi juego"

- Rick plays World 1 with Sophie. The question to her: "¿Este es tu juego?" Notes go into `docs/PLAYTEST.md`.
- **Gate:** Sophie says yes. Her change requests become tasks before Phase 11.

---

### PHASE 11 · Juice and FX

- **OBJECTIVE:** every action feels great.
- **INPUT FILES:** sections 11 (popups), 21, 46 flags.
- **FILES TO CREATE:** `assets/sprites/fx_*.png` (hand-made pixel FX, no credits), `src/view/render/fx.js`, `src/view/render/rainbowTrail.js`, `src/view/juice.js` (complete).
- **ASSETS REQUIRED:** none.
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:** every FX in section 21 hooked to its event. The rainbow trail rules. Hitstop, shake (with the setting), flashes (with the setting), floating score numbers (bitmap font), speed lines (FAST), slow ring and time-warp tint (SLOW), invincible aura and stars, stomp ring, coin sparkle, landing dust, perfect burst, perfect-streak sky rainbow. Particle pools with caps.
- **VALIDATION:** a GIF per effect in `docs/qa/fx/`. Performance unchanged (60 fps on the S23 profile). "Reduce shake" and "Reduce flashing" verified.
- **DONE CRITERIA:** no action without visual feedback.
- **DEPENDENCIES:** Phase 10.

---

### PHASE 12 · Audio: engine, SFX, World 1 music

- **OBJECTIVE:** a full audio system with the World 1 song, the title song and every SFX.
- **INPUT FILES:** sections 27 to 29, 40.
- **FILES TO CREATE:** `src/audio/engine.js`, `src/audio/sfx.js`, `src/vendor/zzfx.js` (with its MIT license header), `src/audio/music/sequencer.js`, `instruments.js`, `songs/title.js`, `songs/world1.js`, `songs/invincible.js`, `songs/jingles.js`, `tests/unit/sequencer.test.mjs`.
- **ASSETS REQUIRED:** none.
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:**
  1. Buses, unlock, `audioSession`, volumes from settings.
  2. Every SFX in section 29.1, tuned by intent, hooked to events.
  3. The sequencer with layers and bar-quantized crossfades. SLOW tempo glide and low-pass. The INV theme swap.
  4. Compose `title`, `world1`, `invincible` and all jingles with the motif of section 28.4.
  5. A debug sound board page `?sounds` that lists and plays every SFX and song with its layers.
- **VALIDATION:** checklist A1 to A12 (A7 and A8 on Rick's devices later). Sequencer unit test: scheduled note times are exact, layer changes land on bar lines.
- **DONE CRITERIA:** World 1 sounds complete. Rick listens to the `?sounds` board and approves the main theme.
- **DEPENDENCIES:** Phase 6 (events). Can run in parallel with 7 to 11 if convenient.

---

### PHASE 13 · Title, menus, transitions, i18n

- **OBJECTIVE:** the full magical front end.
- **INPUT FILES:** `ref_title_screen.webp`, sections 24, 25, 26, 6.1.
- **FILES TO CREATE:** `src/view/scenes/Title.js` (final), `src/ui/screens/title.js`, `mode.js`, `worldCard.js`, `pause.js`, `settings.js`, `results.js`, `scores.js`, `assets/ui/*` (buttons and panels, hand-made pixel), the logo (`assets/ui/logo_unisalta.png`), complete `strings.*.json`.
- **ASSETS REQUIRED:** credits (≈ 1) for H8.
- **HIGGSFIELD TASKS:** H8 (key-art reference + logo lettering).
- **CODE TASKS:**
  1. The landscape title per section 25.1, with all delights in 25.2.
  2. The transition per section 25.3 (camera tilt from the title sky into World 1).
  3. Mode select, world cards, pause, settings (every setting working and saved), results with count-up, confetti and new-record flow, high scores.
  4. Motion for every DOM animation, with the house presets, and `prefers-reduced-motion` support.
  5. Keyboard and gamepad navigation in menus.
- **VALIDATION:** Playwright flow test through every screen in ES and EN, screenshots of every screen on the 4 profiles, V18 and V20.
- **DONE CRITERIA:** no screen without animation, every button works, no hard cut anywhere.
- **DEPENDENCIES:** Phase 10, Phase 12.

---

### PHASE 14 · Voice lines

- **OBJECTIVE:** Sophie's voice in the game.
- **INPUT FILES:** section 29.3, the recordings from Rick.
- **FILES TO CREATE:** `assets/audio/voice/vo_*_{es,en}.mp3`, `src/audio/voice.js`, a `tools/process_voice.sh` (ffmpeg: trim silence, normalize to -16 LUFS, high-pass 80 Hz, export MP3 96 kbps mono).
- **ASSETS REQUIRED:** Rick's recordings. Ask Rick for them at the start of Phase 12 so they arrive in time.
- **HIGGSFIELD TASKS:** only if there are no recordings: H10 (preflight, batch).
- **CODE TASKS:** voice playback with priority, cooldown and ducking, hooked to events.
- **VALIDATION:** A6, every line plays in both languages.
- **DONE CRITERIA:** voice lines in, Rick approves.
- **DEPENDENCIES:** Phase 12.

---

### ★ MILESTONE M3 · "Mágico"

- A full World 1 experience at release quality on the iPad: title → World 1 → game over → replay, in ES and EN, with sound and voice.
- **Gate:** Rick and Sophie say it feels magical. Feedback into `docs/PLAYTEST.md`.

---

### PHASES 15a to 15e · Worlds 2 to 6

Repeat this template once per world, in order (2, 3, 4, 5, 6):

- **OBJECTIVE:** World N with its look, mechanic, music variation and patterns.
- **INPUT FILES:** section 15 row N, the World 1 kit (consistency reference), the previous world's kit.
- **FILES TO CREATE:** `assets/props/wN/*`, `assets/tiles/tiles_wN.png`, `src/audio/music/songs/worldN.js`, world-specific FX (rain, stars, dust), `worldN` entries in `worlds.json`, any new chunks (validated), the world gate arch, the world card art.
- **ASSETS REQUIRED:** credits ≈ 1 per world.
- **HIGGSFIELD TASKS:** H6 and H7 for World N.
- **CODE TASKS:** the world's new mechanic (if not already done in greybox), ambient FX, night rim light for World 4, lightning with the flash setting for World 5, the Lap 2+ hue shift.
- **VALIDATION:** V15 grayscale check, the validator, the bot report per world, 60 fps.
- **DONE CRITERIA:** the world plays and looks finished, and it transitions in and out cleanly.
- **DEPENDENCIES:** the previous world phase. M3.

**Scope valve:** after 15b (World 3), check with Rick: ship v1.0 now with 3 worlds and continue 15c to 15e as v1.1, or keep going.

---

### PHASE 16 · Secrets, gallery, PWA, offline

- **OBJECTIVE:** delight and installability.
- **INPUT FILES:** section 57 (secret delights), sections 41, 43, 54 (R12).
- **FILES TO CREATE:** `src/ui/screens/gallery.js`, `manifest.webmanifest`, `sw.js`, `assets/icons/*` (composed from final sprites by a script, no credits), an Open Graph image.
- **ASSETS REQUIRED:** none new (the gallery shows the references and the matching game sprites).
- **HIGGSFIELD TASKS:** none (H9 only if Rick wants AI icons).
- **CODE TASKS:** every secret in section 57. Gallery unlock at World 3. The service worker caches the CDN libraries and assets (cache-first for assets, stale-while-revalidate for code), with a version bump on each release.
- **VALIDATION:** Playwright offline test (after the first load, go offline, reload, play). Lighthouse PWA installability.
- **DONE CRITERIA:** the game installs on the iPad home screen and plays offline.
- **DEPENDENCIES:** 15 (or the chosen scope).

---

### PHASE 17 · QA and balancing on devices and with the girls

- **OBJECTIVE:** a tuned, stable game.
- **INPUT FILES:** sections 45 to 49, `docs/PLAYTEST.md`.
- **FILES TO CREATE:** `docs/qa/final_report.md`.
- **ASSETS REQUIRED:** none.
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:** fix everything found. Re-tune with the bot. A 30-minute soak run with `?autoplay` and zero errors. The low-effects auto-mode (R13).
- **VALIDATION:** all checklists (V1 to V20, A1 to A12) checked off with evidence. The Alana test and the Sophie test (section 45) done by Rick.
- **DONE CRITERIA:** the final report shows everything passed.
- **DEPENDENCIES:** Phase 16.

---

### PHASE 18 · Release

- **OBJECTIVE:** a public, shareable link.
- **INPUT FILES:** the repo.
- **FILES TO CREATE:** the final `README.md` (how to play, how to install on iPad/iPhone/Android, credits: "Una idea de Sophie", licenses for Phaser, Motion, ZzFX, Pixelify Sans), a `CHANGELOG.md`.
- **ASSETS REQUIRED:** none.
- **HIGGSFIELD TASKS:** none.
- **CODE TASKS:** a release PR to `main` (only with Rick's go-ahead). Rick enables GitHub Pages (Settings → Pages → Deploy from branch `main`, folder `/root`). Verify `https://lothra2.github.io/my-daugthers-games/uni-salta/`. Tag `uni-salta-v1.0`.
- **VALIDATION:** the Playwright smoke against the live URL, on the 4 profiles.
- **DONE CRITERIA:** the game is live and Rick has the link.
- **DEPENDENCIES:** Phase 17, and Rick's privacy decision (R11).

---

## 57. Secret delights

Small surprises. None of them changes the rules.

1. **Smiling clouds:** 1 in 40 background clouds has a face, and it winks when the unicorn passes.
2. **Curious slimes:** slimes look up when she jumps over them. Snakes look down when she ducks under them.
3. **Sky rainbow:** a perfect streak of 3 paints a rainbow arc across the sky for 8 s.
4. **The wave:** every 1000 m she waves at the player while running (one `celebrate` beat) with a "¡Bien!" voice.
5. **Five taps:** tapping the title unicorn 5 times makes her flip and squeak.
6. **Los dibujos de Sophie:** the gallery unlocks at World 3 and shows Sophie's original drawings next to their game versions, signed "Sophie, 7 años".
7. **Thor:** very rarely (1 run in 15), a cloud shaped like a dog trots by in World 1's far layer. Name it "Thor" in the gallery. (Rick can send a photo of Thor so the cloud matches his ears and tail.)
8. **December party:** in December (both girls' birthday month) the unicorn wears a tiny party hat and the title has confetti.
9. **Sleepy title:** if nobody touches the title for 60 s, the unicorn falls asleep on a cloud with "Z" pixels, and wakes with a stretch when touched.
10. **Slime dance:** in the rare event that 3 flat slimes are stomped in one chain, the next slime does a little dance before you reach it.

---

## 58. Open points for Rick (answer anytime, defaults apply until then)

| # | Question | Default |
|---|---|---|
| Q1 | Higgsfield credits: the account shows 0.76. Can you check the USD 10 top-up? Needed: about 35 to 75 credits in total | Free phases first |
| Q2 | Caramelitos (coins) = the yellow swirl, and the yellow lollipop = FAST power-up. OK? | Yes |
| Q3 | Does Sophie want to name the unicorn? | "Uni" |
| Q4 | Privacy: first names, drawings and voice in a public repo? | First names only, decide before M4 |
| Q5 | A photo of Thor for the secret cloud? | A generic cloud dog |
| Q6 | Open PRs at milestones automatically? | Ask each time |
