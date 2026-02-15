(function () {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const world = { groundY: H - 70 };

    // Input with rising-edge detection for Space
    const input = { left: false, right: false, jump: false, jumpPressed: false };
    window.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') input.left = true;
        if (e.key === 'ArrowRight') input.right = true;
        if (e.code === 'Space') { if (!input.jump) input.jumpPressed = true; input.jump = true; }
    });
    window.addEventListener('keyup', e => {
        if (e.key === 'ArrowLeft') input.left = false;
        if (e.key === 'ArrowRight') input.right = false;
        if (e.code === 'Space') input.jump = false;
    });

    // Player
    class Player {
        constructor() { this.x = 100; this.y = world.groundY - 30; this.w = 40; this.h = 40; this.vy = 0; this.onGround = true; this.walkAnim = 0; }
        update() {
            // basic gravity and ground
            this.vy += 0.8; this.y += this.vy;
            if (this.y + this.h / 2 >= world.groundY) { this.y = world.groundY - this.h / 2; this.vy = 0; this.onGround = true; }
        }
        draw(state, cameraX, opts = {}) {
            // If in bus, draw only the head peeking out of the chosen window
            if (state === 'inBus' && opts.bus) {
                const wc = opts.windowCenter;
                let hx, hy;
                if (wc) { hx = Math.round(wc.x); hy = Math.round(wc.y); }
                else { hx = Math.round(this.x - cameraX); hy = Math.round(opts.bus.y) - 26; }
                // draw head centered in the window and linked to bus movement (wc already accounts for camera)
                ctx.fillStyle = '#ffd8b1'; ctx.beginPath(); ctx.arc(hx + 2, hy, 10, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#6b3f2b'; ctx.fillRect(hx - 8, hy - 8, 24, 8);
                return;
            }
            const sx = Math.round(this.x - cameraX), sy = Math.round(this.y);
            // body (uniform)
            ctx.fillStyle = '#001f5b'; ctx.fillRect(sx - 10, sy - 18, 20, 18);
            ctx.fillStyle = '#800000'; ctx.fillRect(sx - 10, sy, 20, 8);
            // head
            ctx.fillStyle = '#ffd8b1'; ctx.beginPath(); ctx.arc(sx + 2, sy - 26, 10, 0, Math.PI * 2); ctx.fill();
            // hair
            ctx.fillStyle = '#6b3f2b'; ctx.fillRect(sx - 8, sy - 34, 24, 8);
            // backpack
            ctx.fillStyle = '#800000'; ctx.fillRect(sx + 12, sy - 12, 10, 18);

            // legs: only visible and animated while walking/not in bus
            const moving = (state === 'walkToBus' || state === 'walkToSchool' || state === 'onStairs');
            if (moving) { this.walkAnim += 0.22; }
            const legSwing = Math.sin(this.walkAnim) * 0.6;
            ctx.save(); ctx.translate(sx + 2, sy + 12);
            ctx.fillStyle = '#ffd8b1';
            ctx.save(); ctx.translate(-8, 0); ctx.rotate(legSwing * 0.35); ctx.fillRect(-2, 0, 6, 14); ctx.restore();
            ctx.save(); ctx.translate(8, 0); ctx.rotate(-legSwing * 0.35); ctx.fillRect(-2, 0, 6, 14); ctx.restore();
            ctx.restore();
        }
    }

    const player = new Player();

    // Bus
    const bus = { x: 360, width: 240, height: 90, wheelRadius: 18, color: '#444444', stripe: '#c7b98b', speed: 5, doorOpen: false, doorProg: 0, stopOffset: 60, boarding: false, arrivalPlayed: false };
    bus.y = world.groundY - Math.round(bus.height / 2);

    // Level
    const level = { width: 2600, schoolX: 2400 };
    const schoolWidth = 360;
    const schoolStories = 3;
    
    const storyH = 100;
    const stairs = { x: level.schoolX - 180, steps: 6, w: 22, h: 12 };

    // Traffic cars
    const trafficCars = [];
    const carColors = ['#e74c3c', '#3498db', '#f1c40f', '#27ae60', '#9b59b6'];
    function spawnTrafficCars() {
        trafficCars.length = 0;
        // Place cars ahead of the bus, spaced out, all on the same plane as the bus
        let carStart = bus.x + bus.width + 120;
        for (let i = 0; i < 3; i++) {
            trafficCars.push({
                x: carStart + i * 260 + Math.random() * 60,
                y: bus.y,
                w: 110 + Math.random() * 40,
                h: 48 + Math.random() * 12,
                color: carColors[i % carColors.length],
                speed: 2.2 + Math.random() * 1.2
            });
        }
    }
    spawnTrafficCars();

    // States: startPrompt -> walkToBus -> waitingBoard -> inBus -> waitingExit -> walkToSchool -> onStairs -> atSchool
    let state = 'startPrompt';
    let cameraX = 0; let finished = false; let boardTime = 0, arrivalTime = 0;

    // Audio (simple beeps)
    let audioCtx = null; 
    function ensureAudio() { 
        if (!audioCtx) { 
            try { 
                audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
            } catch (e) { 
                audioCtx = null; 
            } 
        } 
    }

    function beep(freq, dur) { 
        ensureAudio(); 
        if (!audioCtx) 
            return; 
        const o = audioCtx.createOscillator(), g = audioCtx.createGain(); 
        o.type = 'sine'; 
        o.frequency.value = freq; 
        o.connect(g); 
        g.connect(audioCtx.destination); 
        const now = audioCtx.currentTime; 
        g.gain.setValueAtTime(0.0001, now); 
        g.gain.exponentialRampToValueAtTime(0.08, now + 0.01); 
        o.start(now); 
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur / 1000); 
        o.stop(now + dur / 1000 + 0.02); 
    }

    // Engine, step and trumpet sounds
    let engineOsc = null, engineGain = null; let engineRunning = false;
    function startEngine() { 
        ensureAudio(); 
        if (!audioCtx || engineRunning) 
            return; 
        engineOsc = audioCtx.createOscillator(); 
        engineGain = audioCtx.createGain(); 
        engineOsc.type = 'sawtooth'; 
        engineOsc.frequency.value = 60; 
        engineGain.gain.value = 0.0001; 
        engineOsc.connect(engineGain); 
        engineGain.connect(audioCtx.destination); 
        engineOsc.start(); 
        engineGain.gain.exponentialRampToValueAtTime(0.04, audioCtx.currentTime + 0.05); 
        engineRunning = true; 
    }
    function setEngineTone(speedFactor) { 
        if (!engineRunning || !engineOsc) 
            return; 
        const f = 60 + Math.min(220, Math.max(0, speedFactor * 220)); 
        engineOsc.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.05); 
    }
    function stopEngine() { 
        if (!audioCtx || !engineRunning) 
            return; 
        try { 
            engineGain.gain.setValueAtTime(0.0001, audioCtx.currentTime); 
            engineOsc.stop(audioCtx.currentTime + 0.01); 
        } catch (e) { } 
        engineOsc = null; 
        engineGain = null; 
        engineRunning = false; 
    }

    let lastStepX = 0; 
    function playStep() { 
        ensureAudio(); 
        if (!audioCtx) 
            return; 
        const o = audioCtx.createOscillator(), g = audioCtx.createGain(); 
        o.type = 'square'; 
        o.frequency.value = 520; 
        g.gain.value = 0.0001; 
        o.connect(g); 
        g.connect(audioCtx.destination); 
        const now = audioCtx.currentTime; 
        g.gain.exponentialRampToValueAtTime(0.06, now + 0.01); 
        o.start(now); 
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08); 
        o.stop(now + 0.12);
    }

    let trumpetPlayed = false; 
    function playTrumpet() {
        ensureAudio(); 
        if (!audioCtx) 
            return; 
        const now = audioCtx.currentTime; 
        const o1 = audioCtx.createOscillator(), 
        g1 = audioCtx.createGain(); 
        o1.type = 'triangle'; 
        o1.frequency.value = 880; 
        o1.connect(g1); 
        g1.connect(audioCtx.destination); 
        g1.gain.setValueAtTime(0.0001, now); 
        g1.gain.exponentialRampToValueAtTime(0.12, now + 0.01); 
        o1.start(now); 
        o1.frequency.linearRampToValueAtTime(660, now + 0.2); 
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45); 
        o1.stop(now + 0.5);
    }

    function update() {
        // Check for collision between player and traffic cars (only when walking, not in bus)
        if (state === 'walkToBus' || state === 'walkToSchool' || state === 'onStairs') {
            for (const car of trafficCars) {
                // Simple AABB collision
                const px = player.x, py = player.y;
                const pw = player.w, ph = player.h;
                const cx = car.x, cy = car.y;
                const cw = car.w, ch = car.h;
                if (
                    px + pw / 2 > cx && px - pw / 2 < cx + cw &&
                    py + ph / 2 > cy && py - ph / 2 < cy + ch
                ) {
                    finished = true;
                    state = 'gameOver';
                    stopEngine();
                    break;
                }
            }
        }
        // Move traffic cars (all move right, like the bus)
        for (const car of trafficCars) {
            car.x += car.speed;
            // Wrap cars to the left if they go off screen
            if (car.x > level.width + 60) car.x = -car.w - 60;
        }
        if (state === 'startPrompt') {
            if (input.jumpPressed) {
                input.jumpPressed = false;
                state = 'walkToBus';
            }
            return;
        }
        // animate door
        if (bus.doorOpen) 
            bus.doorProg += 0.06; 
        else 
            bus.doorProg -= 0.06; 
        
        bus.doorProg = Math.max(0, Math.min(1, bus.doorProg));

        // state machine
        if (state === 'walkToBus' || state === 'waitingBoard') {
            // player movement controlled by arrows
            let moved = false;
            if (input.right) { 
                player.x += 1.8; 
                player.walkAnim += 0.18; 
                moved = true; 
            }
            if (input.left) { 
                player.x -= 1.8; 
                player.walkAnim += 0.12;
                moved = true; 
            }
            // play walking sound when moving on the ground
            if (moved && Math.abs(player.x - lastStepX) > 12) { 
                playStep(); 
                lastStepX = player.x; 
            }
            // if near bus door, enter waitingBoard state and allow boarding
            const doorX = bus.x + bus.width - 62; 
            const boardSpot = doorX - 20;
            if (player.x + 10 >= boardSpot) { 
                player.x = boardSpot; 
                state = 'waitingBoard'; 
                bus.doorOpen = true; 
            }
            if (state === 'waitingBoard' && input.jumpPressed) { 
                state = 'inBus'; 
                input.jumpPressed = false; 
                player.x = bus.x + 40; 
                player.y = bus.y; 
                bus.doorOpen = false; 
                boardTime = performance.now(); 
                beep(880, 140); 
            }
            if (!moved) { /* idle */ }
        }
        else if (state === 'inBus') {
            // bus movement controlled by arrows, but blocked by car in front
            let busMoved = false;
            let canMoveRight = true;
            // Check for car in front
            for (const car of trafficCars) {
                if (
                    car.x > bus.x + bus.width - 10 &&
                    car.x < bus.x + bus.width + 80 &&
                    Math.abs(car.y - bus.y) < 30
                ) {
                    canMoveRight = false;
                    break;
                }
            }
            if (input.right && canMoveRight) { 
                bus.x += bus.speed; busMoved = true; 
            }
            if (input.left) { bus.x -= bus.speed; busMoved = true; }
            // clamp bus
            bus.x = Math.max(0, Math.min(level.width - bus.width, bus.x));
            player.x = bus.x + 40; player.y = bus.y;
            const dropX = stairs.x - (bus.width - 62) - bus.stopOffset;
            if (bus.x >= dropX) { 
                bus.x = dropX; 
                bus.doorOpen = true; 
                state = 'waitingExit'; 
                arrivalTime = performance.now(); 
                if (!bus.arrivalPlayed) { 
                    beep(440, 300); 
                    bus.arrivalPlayed = true; 
                } 
            }
            // engine sound
            if (busMoved) { 
                startEngine(); 
                setEngineTone(1.0); 
            } else { 
                stopEngine(); 
            }
        }
        else if (state === 'waitingExit') {
            stopEngine();
            if (input.jumpPressed) { 
                input.jumpPressed = false; 
                state = 'walkToSchool'; 
                player.x = bus.x + bus.width - 80; 
                bus.doorOpen = false; 
            }
        }
        else if (state === 'walkToSchool') {
            // user-controlled walking toward stairs and door
            const bigDoorW = 54;
            const bigDoorX = level.schoolX + schoolWidth - bigDoorW - 18;
            if (input.right) { player.x += 1.6; player.walkAnim += 0.18; }
            if (input.left) { player.x -= 1.6; player.walkAnim += 0.12; }
            if ((input.right || input.left) && Math.abs(player.x - lastStepX) > 12) { 
                playStep(); 
                lastStepX = player.x; 
            }
            // If player is past the stairs, allow her to walk all the way to the door
            if (player.x >= stairs.x + stairs.steps * stairs.w - 4) {
                // move to door on ground
                player.y = world.groundY - player.h / 2;
                if (player.x >= bigDoorX - 10) {
                    state = 'atSchool';
                    finished = true;
                    if (!trumpetPlayed) { 
                        playTrumpet(); 
                        trumpetPlayed = true; 
                    }
                }
            } else if (player.x >= stairs.x) {
                state = 'onStairs';
            }
        }
        else if (state === 'onStairs') {
            // step through stairs left->right descending, controlled by arrows
            if (input.right) { 
                player.x += 1.0; 
                player.walkAnim += 0.18;
            }
            if (input.left) { 
                player.x -= 1.0; 
                player.walkAnim += 0.12; 
            }
            const rel = Math.max(0, Math.min(player.x - stairs.x, stairs.steps * stairs.w - 1));
            const idx = Math.floor(rel / stairs.w);
            const topY = world.groundY; const stepY = topY + idx * stairs.h;
            player.y = stepY - player.h / 2;
            // play step sound per step distance
            if (Math.abs(player.x - lastStepX) > Math.max(8, stairs.w * 0.45)) { 
                playStep(); 
                lastStepX = player.x; 
            }
            // check if player reached the big door
            const bigDoorW = 54;
            const bigDoorX = level.schoolX + schoolWidth - bigDoorW - 18;
            if (idx === stairs.steps - 1 && player.x >= bigDoorX - 10) {
                state = 'atSchool';
                finished = true;
                if (!trumpetPlayed) { 
                    playTrumpet(); 
                    trumpetPlayed = true; 
                }
            }
        }
        else if (state === 'atSchool') {
            // keep player at the last stair level (don't apply gravity)
            // center camera on school so the entire building is visible
            const target = Math.round(level.schoolX + Math.round(schoolWidth / 2) - W / 2);
            cameraX = Math.max(0, Math.min(level.width - W, target));
            // ensure engine off
            stopEngine();
        }
        else { 
            player.update(); 
        }

        // clamp
        if (player.x < 20) player.x = 20;
        // Allow player.x to go slightly past level.width so camera can show the school door
        const maxPlayerX = level.schoolX + schoolWidth - 10;
        if (player.x > maxPlayerX) player.x = maxPlayerX;
        // Camera: always allow scrolling to show the rightmost part of the school and door
        const maxCameraX = Math.max(0, level.schoolX + schoolWidth - W + 40);
        cameraX = Math.max(0, player.x - W / 2);
        cameraX = Math.min(maxCameraX, cameraX);
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        // sky
        ctx.fillStyle = '#d7f0d7'; ctx.fillRect(0, 0, W, world.groundY - 120);

        // distant buildings (parallax)
        const cityParallax = cameraX * 0.25;
        for (let bx = -600; bx < level.width + 600; bx += 300) {
            const idx = Math.abs(Math.floor(bx / 300)) % 4;
            const bW = 180; const bh = 80 + idx * 18;
            const bxScreen = Math.round(bx - cityParallax);
            const byTop = Math.round(world.groundY - 40 - bh);
            // skip off-screen clusters for performance
            if (bxScreen + bW < -100 || bxScreen > W + 100) continue;
            // building body
            const colors = ['#b3cde0', '#c7d7b9', '#d3b6c6', '#cfcfcf']; ctx.fillStyle = colors[idx % colors.length]; ctx.fillRect(bxScreen, byTop, bW, bh);
            // windows
            ctx.fillStyle = '#ffee88';
            const cols = 3, rows = Math.max(2, Math.floor(bh / 28));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const wx = bxScreen + 14 + c * Math.round((bW - 28) / cols);
                    const wy = byTop + 12 + r * 22;
                    ctx.fillRect(wx, wy, Math.round(bW * 0.16), 12);
                }
            }
        }

        // trees in foreground along the road
        const treeParallax = cameraX * 0.5;
        for (let tx = -200; tx < level.width + 200; tx += 360) {
            const txScreen = Math.round(tx - treeParallax);
            if (txScreen < -80 || txScreen > W + 80) continue;
            // trunk
            const trunkH = 20; ctx.fillStyle = '#7b5a2a'; ctx.fillRect(txScreen + 8, world.groundY - 26, 8, trunkH);
            // foliage
            ctx.fillStyle = '#2f8b3b'; ctx.beginPath(); ctx.arc(txScreen + 12, world.groundY - 34, 18, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(txScreen - 2, world.groundY - 22, 14, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(txScreen + 26, world.groundY - 22, 14, 0, Math.PI * 2); ctx.fill();
        }

        // ground and road
        ctx.fillStyle = '#6aa84f'; ctx.fillRect(0, world.groundY, W, H - world.groundY);
        ctx.fillStyle = '#7f7f7f'; ctx.fillRect(0, world.groundY + 22, W, 28);

        // Draw traffic cars (behind bus and player)
        for (const car of trafficCars) {
            const cx = Math.round(car.x - cameraX);
            // Draw cars on the same plane as the bus
            const cy = Math.round(bus.y);
            ctx.save();
            ctx.fillStyle = car.color;
            ctx.fillRect(cx, cy, car.w, car.h);
            // windows
            ctx.fillStyle = '#e0e6f7';
            ctx.fillRect(cx + 8, cy + 5, car.w - 16, car.h / 2 - 2);
            // wheels
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(cx + 18, cy + car.h, 10, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + car.w - 18, cy + car.h, 10, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // stairs (start at street level and descend)
        for (let s = 0; s < stairs.steps; s++) { 
            const sx = Math.round(stairs.x + s * stairs.w - cameraX); 
            const sy = Math.round(world.groundY + s * stairs.h); 
            ctx.fillStyle = '#bdbdbd'; 
            ctx.fillRect(sx, sy, stairs.w, stairs.h); 
            ctx.strokeStyle = '#777'; 
            ctx.strokeRect(sx, sy, stairs.w, stairs.h); 
        }

        // school below stairs (3 levels, all pink)
        const schoolX = Math.round(level.schoolX - cameraX);
        const schoolTop = world.groundY + stairs.steps * stairs.h + 8;
        // Draw school name background above all stories
        const nameBarHeight = 36;
        ctx.fillStyle = '#ffc0d0';
        ctx.fillRect(schoolX, schoolTop - (schoolStories * storyH) - nameBarHeight, schoolWidth, nameBarHeight);
        // Draw school name (centered, above windows)
        ctx.fillStyle = '#333';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('St. Francis Cospicua', schoolX + Math.round(schoolWidth / 2), schoolTop - (schoolStories * storyH) - nameBarHeight / 2 + 8);
        // draw stories stacked upwards
        for (let s = 0; s < schoolStories; s++) {
            const y = schoolTop - (schoolStories - s) * storyH;
            ctx.fillStyle = '#ffc0d0';
            ctx.fillRect(schoolX, y, schoolWidth, storyH);
            // windows per story
            ctx.fillStyle = '#fff'; const cols = 4;
            for (let c = 0; c < cols; c++) {
                const wx = schoolX + 18 + c * Math.round((schoolWidth - 36) / cols);
                const wy = y + 18;
                const wW = Math.round(schoolWidth * 0.09), wH = Math.round(storyH * 0.25);
                ctx.fillRect(wx, wy, wW, wH); 
                ctx.strokeStyle = '#c88'; 
                ctx.strokeRect(wx, wy, wW, wH);
            }
        }
        // big wooden door at bottom right
        // Draw the bus and player first
        // ...existing code for bus drawing...
        const bx = Math.round(bus.x - cameraX), by = Math.round(bus.y);
        ctx.fillStyle = bus.color; ctx.fillRect(bx, by - bus.height / 2, bus.width, bus.height);
        ctx.fillStyle = bus.stripe; ctx.fillRect(bx, by - bus.height / 2 + Math.round(bus.height * 0.18), bus.width, Math.round(bus.height * 0.16));
        ctx.fillStyle = '#333'; ctx.fillRect(bx, by - 6, bus.width, 6);
        // windows (computed to fit smaller bus)
        ctx.fillStyle = '#77aaff';
        const winW = Math.max(28, Math.round(bus.width * 0.13));
        const winH = Math.max(20, Math.round(bus.height * 0.28));
        const winStart = bx + 12;
        const winGap = Math.max(6, Math.round((bus.width - 24 - winW * 3) / 2));
        const windowCenters = [];
        for (let i = 0; i < 3; i++) {
            const wx = winStart + i * (winW + winGap);
            ctx.fillRect(wx, by - 18, winW, winH);
            windowCenters.push({ x: wx + Math.round(winW / 2), y: (by - 18) + Math.round(winH / 2) });
        }
        // wheels (bigger)
        const wheelCY = Math.round(by + (bus.height / 2) - Math.round(bus.wheelRadius / 2)); 
        ctx.fillStyle = '#222'; 
        ctx.beginPath(); 
        ctx.arc(bx + 24, wheelCY, bus.wheelRadius, 0, Math.PI * 2); 
        ctx.fill(); ctx.beginPath(); 
        ctx.arc(bx + bus.width - 34, wheelCY, bus.wheelRadius, 0, Math.PI * 2); 
        ctx.fill();
        // door animation (slides right when opening)
        const doorX = bx + bus.width - 52; 
        const doorW = 28, doorH = 30; 
        const openOffset = Math.round(bus.doorProg * 28); 
        ctx.fillStyle = '#222'; 
        ctx.fillRect(doorX + openOffset, by - 10, doorW, doorH);
        ctx.fillStyle = '#fff'; 
        ctx.font = '14px sans-serif'; 
        ctx.textAlign = 'left'; 
        ctx.fillText('School Transport', bx + 10, by - bus.height / 2 + 16);

        // player (pass window center for head-in-window)
        const preferredWindow = windowCenters.length ? windowCenters[1] : null;
        player.draw(state, cameraX, { bus, windowCenter: preferredWindow });

        // Draw the big wooden school door at the bottom right of the school, always in the foreground
        let bigDoorW = 54, bigDoorH = 80;
        let bigDoorX = schoolX + schoolWidth - bigDoorW - 5;
        let bigDoorY = schoolTop - bigDoorH - 10;
        ctx.save();
        ctx.fillStyle = '#8b5c2a';
        ctx.fillRect(bigDoorX, bigDoorY, bigDoorW, bigDoorH);
        ctx.strokeStyle = '#6b3f2b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bigDoorX + bigDoorW - 12, bigDoorY + bigDoorH / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#e0c080';
        ctx.fill();
        ctx.restore();

        // prompts
        ctx.textAlign = 'center'; ctx.fillStyle = '#111'; ctx.font = '16px sans-serif';
        if (state === 'startPrompt') {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#222';
            ctx.font = '28px sans-serif';
            ctx.fillText('Press [Space] to Start', W / 2, H / 2);
            ctx.font = '16px sans-serif';
            ctx.fillText('Use arrow keys to move', W / 2, H / 2 + 32);
        }
        if (state === 'waitingBoard') ctx.fillText('Press [Space] to board', W / 2, 40);
        if (state === 'waitingExit') ctx.fillText('Press [Space] to exit the bus', W / 2, 40);
        
        if (finished) { 
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; 
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '28px sans-serif';
            if (state === 'gameOver') {
                ctx.fillText('Game Over!', W / 2, H / 2 - 8);
                ctx.font = '16px sans-serif';
                ctx.fillText('You were hit by a car.', W / 2, H / 2 + 18);
                ctx.fillText('Refresh to try again.', W / 2, H / 2 + 38);
            } else {
                ctx.fillText('You made it to school!', W / 2, H / 2 - 8);
                ctx.font = '16px sans-serif';
                ctx.fillText('Refresh to play again.', W / 2, H / 2 + 18);
            }
        }
    }

    function loop() {
        // handle rising-edge reset for jumpPressed
        update(); draw(); input.jumpPressed = false; requestAnimationFrame(loop);
    }

    loop();

})();
