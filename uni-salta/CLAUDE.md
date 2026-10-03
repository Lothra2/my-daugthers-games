# UNI-SALTA project memory

Pixel art endless runner for Rick's daughters (Sophie, 7, original concept. Alana, 4, plays easy mode "Nubecita"). Live at https://lothra2.github.io/my-daugthers-games/uni-salta/ (GitHub Pages from `main`, repo Lothra2/my-daugthers-games, game in `uni-salta/`). Rick writes in Spanish, casual Venezuelan, no em dashes, no semicolons, direct and critical. Post copy for LinkedIn is in English.

## Rules
- Never commit or print the Higgsfield key. It lives only in `~/.config/higgsfield/key` (or env `HF_KEY`). Rick disables the API when assets are done. Total spend about USD 4.7 of 10 (see `docs/CREDITS.md`).
- No PRs unless asked. Publishing means pushing `HEAD:main` and `HEAD:claude/uni-salta-build`, then checking the live `sw.js` version matches.
- No voice lines, only sound effects. Player names the unicorn. Spanish and English.
- Run `python3 tools/build_sw.py` before every commit (it refreshes `sw-assets.json` and the cache version in `sw.js`).

## Architecture
- `src/core/` deterministic sim (no Phaser, no Math.random): `sim.js`, `bot.js`, `config.js`. `src/view/` Phaser 4 rendering. `src/ui/` DOM UI with Motion. `src/audio/` ZzFX plus procedural music.
- 9 worlds (`CFG.NUM_WORLDS`), portal gate seam between worlds, bosses at the end of world 6 (Serpent Queen) and 9 (Ghost King) with reflectable gold orbs, power-up cutscenes (`src/view/Cutscene.js`), 2 checkpoint flags per world plus one at the boss door (revive once per flag, keeps score).
- Art pipeline: Higgsfield sheets in `art-src/higgsfield/h*`, built by `tools/build_*.py` (`build_new.py` is the latest wave). Palettes in `src/data/palette.json`.

## Hard-won lessons
- The Game scene object is reused on restart: reset every lazily created field in `Game.create` (this caused the boss freeze).
- Avoid `structuredClone`, `replaceAll`, `||=` (older tablets). Never give a TileSprite zero width.
- Frame loop is wrapped (`update` -> `updateInner`) with recovery, plus reload on lost WebGL context or a frozen loop (`src/main.js`).
- Service worker is network first with a content-hash version.

## Tests (all must pass before publishing)
`npm test`, `node tools/validate_patterns.mjs`, `node tools/fuzz_boss.mjs`, `node tools/boss_test.mjs`, and e2e in `tests/e2e/` (`mechanics`, `menus`, `flow`, `checkpoint`, `soak`, `devices`, `bossfuzz`, `blackscreen`, `oldbrowser`).

## Open items
- Sound only verified numerically, Rick approved it by ear.
- Not done: moving platforms, December party hat, sleepy title, cloud wink. Black screen on one tablet was hardened but not reproduced, ask for tablet model if it returns.
