# Ride to School — Simple 2D Browser Game

Files:

- `index.html` — game page
- `css/style.css` — styles
- `js/game.js` — canvas game logic

How to run:

1. Open `index.html` in a browser (double-click or drag into browser).
2. Use left/right arrows or A/D to move, Space to jump.

Notes: This is a minimal demo using canvas and simple shapes. I can add sprites, sound, or levels next — tell me what you'd like.

Added features:

- Boarding animation: the girl now walks to a larger black school bus and boards it. The bus door animates open/closed.
- Sounds: simple boarding and arrival beeps are generated with the WebAudio API (may require a user gesture to enable audio in some browsers).
- Timings and speed: bus speed and boarding/arrival delays are configurable in `js/game.js` via the `bus` object (`bus.speed`, `bus.boardDelay`, `bus.arrivalDelay`).

If you'd like, I can: add external audio files, replace the shapes with sprite art, or expose UI controls to tweak speed/timings at runtime.
