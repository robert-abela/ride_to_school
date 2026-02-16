
# Ride to School — 2D Canvas Game

A small browser game where you help a student board a school transport and make it safely to the school entrance. Built with plain HTML5 Canvas and vanilla JavaScript—no frameworks.  

Play at: https://robert-abela.github.io/ride_to_school.

---

## Quick Start

1. **Project structure (expected by `index.html`):**
   ```text
   /
   ├─ index.html
   ├─ css/
   │  └─ style.css        # optional; not required for gameplay
   └─ js/
      └─ game.js          # the main game logic
   ```
   > If your files are currently in the project root, create the `js/` (and optionally `css/`) folders and move the files accordingly, or update the `<script>` and `<link>` paths in `index.html`.

2. **Run locally:**
   - Easiest: just open `index.html` in a modern desktop browser (Chrome/Edge/Firefox/Safari).  
   - Some browsers restrict audio without a user gesture; press **Space** once to start.

3. **Play:**
   - **Start:** Press **Space** at the start screen.
   - **Move:** **← / →** arrow keys.
   - **Board/Exit the bus:** Press **Space** when prompted.

> **Note:** A/D keys are *not* used. Movement is strictly with the **Arrow** keys, and actions with **Space**.

---

## Objective

Start on the left, walk to the school transport, **board**, drive forward while avoiding getting blocked, **exit** near the stairs, descend and walk to the big door of the school. Reaching the door wins the game; a collision with traffic results in **Game Over**.

---

## Core Features

- **State-driven flow**: `startPrompt → walkToBus → waitingBoard → inBus → waitingExit → walkToSchool → onStairs → atSchool`.
- **Player**: Simple animated character with leg swing while moving; head shown in a bus window when on board.
- **School transport**: Smaller black bus with stripe, sliding door animation, engine sound that reacts to movement, arrival beep, and window placement for the player.
- **Traffic**: Colorful cars drive in the same direction. Contact while walking/stair-descending triggers **Game Over**.
- **Environment**: Parallax city backdrop, trees, road, descending stairs, and a three‑storey school labeled **“St. Francis Cospicua”** with windows and a large wooden entrance door.
- **Audio**: WebAudio beeps for boarding/arrival, step ticks while walking, a trumpet flourish on victory, and a simple engine hum when the bus moves. Audio is created programmatically—no external files required.
- **Camera**: Horizontal scrolling that keeps the action centered and frames the school facade when you arrive.

---

## Controls

| Action                | Key(s)        |
|-----------------------|---------------|
| Start game            | Space         |
| Walk left / right     | ← / → arrows  |
| Board / Exit vehicle  | Space (when prompted) |

---

## Files

- `index.html` — Bootstraps the canvas and loads `js/game.js`.
- `js/game.js` — All gameplay, rendering, audio, and state logic (no external assets).
- `css/style.css` — *(Optional)* A stylesheet link exists in `index.html`. Gameplay does not depend on it.

> `index.html` currently expects the script at `js/game.js` and the stylesheet at `css/style.css`. If you prefer to keep files flat in the project root, change these lines in `index.html` accordingly:
>
> ```html
> <!-- From -->
> <link rel="stylesheet" href="css/style.css">
> <script src="js/game.js"></script>
>
> <!-- To (flat layout) -->
> <link rel="stylesheet" href="style.css"> <!-- or remove if not using CSS -->
> <script src="game.js"></script>
> ```

---

## How It Works (High Level)

- **Input**: Keyboard listeners maintain `input.left`, `input.right`, and a *rising‑edge* `input.jumpPressed` for Space so prompts don’t double‑trigger.
- **Physics/Movement**: Minimal gravity and ground clamp for the player when not inside the bus; stair descent computes the current step index from horizontal position.
- **State Machine**: Each state handles input differently (e.g., bus movement only while in `inBus` and only if not blocked by a car ahead).
- **Rendering**: Single `draw()` pass renders background, road, cars, stairs, school, bus, prompts, and overlays. The camera clamps so the rightmost school entrance is visible.
- **Game End**: Overlay shows **Game Over** (car collision) or **You made it to school!** with instructions to refresh to replay.

---

## Browser Compatibility

Works in current versions of Chromium, Firefox, and Safari. WebAudio requires a user interaction on page load in some browsers (press **Space**). Mobile is not targeted.

---

## Customization Hooks

Adjust these in `js/game.js` if you want to tweak the feel:

- `bus.speed` — Vehicle movement speed.
- Traffic spawn in `spawnTrafficCars()` — Count, spacing, and speed range.
- `schoolStories`, `storyH`, `stairs.steps` — School/stair proportions.
- Colors (bus, stripe, environment) and labels (school name) directly in draw routines.

---

## Known Limitations & Next Ideas

- No pause/menu; refresh to restart.
- No touch controls.
- Basic collision and art (shapes).

**Potential enhancements**: sprite art for characters/vehicles, simple level timer, difficulty modes, scoreboard, and accessibility options (rebindable keys, reduced‑motion mode).

---

## License

MIT.
