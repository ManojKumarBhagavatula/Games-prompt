/**
 * Flappy Bird Engine - Supports Single & Multiplayer
 */

// Global Config
const CONFIG = {
    gravity: 0.25,
    jump: 4.6,
    pipeGap: 100,
    pipeInterval: 100, // frames
    speed: 2 // Pipe speed
};

// Game State Enum
const STATE = {
    GET_READY: 0,
    PLAYING: 1,
    OVER: 2
};

// --- Game Engine Class ---
class FlappyEngine {
    constructor(canvasId, inputKey, scoreElementId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scoreEl = document.getElementById(scoreElementId);

        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.inputKey = inputKey;

        // State
        this.currentState = STATE.GET_READY;
        this.frames = 0;
        this.score = 0;
        this.isDead = false; // For multiplayer check

        // Entities
        this.bird = {
            x: 50,
            y: 150,
            w: 34, h: 24, radius: 12,
            velocity: 0,
            rotation: 0,
            frame: 0,
            animation: [0, 1, 2, 1]
        };

        this.pipes = [];
        this.fgX = 0; // Foreground scroll position

        // Assets colors
        this.bgColor = '#70c5ce';
        this.fgColor = '#ded895'; // Sand
    }

    reset() {
        this.currentState = STATE.GET_READY;
        this.bird.y = 150;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.score = 0;
        this.pipes = [];
        this.frames = 0;
        this.isDead = false;
        this.updateUI();
    }

    flap() {
        if (this.currentState === STATE.GET_READY) {
            this.currentState = STATE.PLAYING;
        }

        if (this.currentState === STATE.PLAYING) {
            this.bird.velocity = -CONFIG.jump;
        }
    }

    update() {
        // Foreground Scroll
        if (this.currentState === STATE.PLAYING || this.currentState === STATE.GET_READY) {
            this.fgX = (this.fgX - CONFIG.speed) % 20;
        }

        // Bird Physics
        if (this.currentState === STATE.GET_READY) {
            // Hover effect
            this.bird.y = 150 + Math.cos(this.frames * 0.1) * 5;
            this.bird.rotation = 0;
        } else if (this.currentState === STATE.PLAYING || this.currentState === STATE.OVER) {
            this.bird.velocity += CONFIG.gravity;
            this.bird.y += this.bird.velocity;

            // Rotation
            if (this.bird.velocity < 0) this.bird.rotation = -25 * Math.PI / 180;
            else {
                this.bird.rotation += 2 * Math.PI / 180;
                this.bird.rotation = Math.min(Math.PI / 2, this.bird.rotation);
            }

            // Floor Collision
            const floorY = this.height - 112; // 112 is FG height
            if (this.bird.y + this.bird.radius >= floorY) {
                this.bird.y = floorY - this.bird.radius;
                this.die();
            }
        }

        // Pipes
        if (this.currentState === STATE.PLAYING) {
            // Generate
            if (this.frames % CONFIG.pipeInterval === 0) {
                const maxY = -150;
                this.pipes.push({
                    x: this.width,
                    y: maxY * (Math.random() + 1),
                    passed: false
                });
            }

            // Move & Delete & Collision
            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                p.x -= CONFIG.speed;

                // Collision Logic
                // Bird circle vs Pipe Rects
                // Top Pipe Rect: x=p.x, y=p.y, w=52, h=400
                // Bottom Pipe Rect: x=p.x, y=p.y+400+gap, w=52, h=400
                const pipeW = 52;
                const pipeH = 400;
                const bottomY = p.y + pipeH + CONFIG.pipeGap;

                // Simple Bounding Box check is robust enough
                let birdLeft = this.bird.x - this.bird.radius;
                let birdRight = this.bird.x + this.bird.radius;
                let birdTop = this.bird.y - this.bird.radius;
                let birdBottom = this.bird.y + this.bird.radius;

                // Horizontal Overlay
                if (birdRight > p.x && birdLeft < p.x + pipeW) {
                    // Vertical Overlay (Top Pipe OR Bottom Pipe)
                    if (birdTop < p.y + pipeH || birdBottom > bottomY) {
                        this.die();
                    }
                }

                // Score
                if (p.x + pipeW < this.bird.x && !p.passed) {
                    this.score++;
                    p.passed = true;
                    this.updateUI();
                }

                // Remove off-screen
                if (p.x + pipeW < 0) {
                    this.pipes.shift();
                    i--;
                }
            }
        }

        // Animation Frame
        this.bird.frame += this.frames % 5 === 0 ? 1 : 0;
        this.bird.frame %= 4;

        this.frames++;
    }

    draw() {
        // Clear
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Background Scenery (Clouds) - Static for simplicity or scrolling slowly
        this.drawClouds();

        // Pipes
        for (let p of this.pipes) {
            this.drawPipe(p.x, p.y);
        }

        // Foreground
        this.ctx.fillStyle = this.fgColor;
        this.ctx.fillRect(0, this.height - 112, this.width, 112);

        // FG Pattern scrolling
        this.ctx.strokeStyle = '#d0c874';
        this.ctx.lineWidth = 2;
        for (let i = -20; i < this.width; i += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(i + this.fgX, this.height - 112);
            this.ctx.lineTo(i + this.fgX - 10, this.height);
            this.ctx.stroke();
        }

        // FG Border
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - 112);
        this.ctx.lineTo(this.width, this.height - 112);
        this.ctx.strokeStyle = '#555';
        this.ctx.stroke();

        // Bird
        this.drawBird();
    }

    drawPipe(x, y) {
        const w = 52;
        const h = 400;
        const gap = CONFIG.pipeGap;

        this.ctx.fillStyle = '#73bf2e';
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;

        // Top Pipe
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeRect(x, y, w, h);
        // Cap
        this.ctx.fillRect(x - 2, y + h - 20, w + 4, 20);
        this.ctx.strokeRect(x - 2, y + h - 20, w + 4, 20);

        // Bottom Pipe
        let by = y + h + gap;
        this.ctx.fillRect(x, by, w, h);
        this.ctx.strokeRect(x, by, w, h);
        // Cap
        this.ctx.fillRect(x - 2, by, w + 4, 20);
        this.ctx.strokeRect(x - 2, by, w + 4, 20);
    }

    drawBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x, this.bird.y);
        this.ctx.rotate(this.bird.rotation);

        // Bird Body
        this.ctx.fillStyle = "#f4ce42";
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = "#000";
        this.ctx.stroke();

        // Eye
        this.ctx.fillStyle = "#FFF";
        this.ctx.beginPath();
        this.ctx.arc(6, -6, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = "#000";
        this.ctx.beginPath();
        this.ctx.arc(8, -6, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Wing
        this.ctx.fillStyle = "#e8e5c5";
        this.ctx.beginPath();
        this.ctx.ellipse(-4, 2, 6, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Beak
        this.ctx.fillStyle = "#f76b1c";
        this.ctx.beginPath();
        this.ctx.moveTo(6, 2);
        this.ctx.lineTo(14, 6);
        this.ctx.lineTo(6, 10);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawClouds() {
        this.ctx.fillStyle = "#FFF";
        // Simple static clouds just to break monotony
        if (this.frames % 1000 < 500) { // lazy optimize
            // Could make these dynamic objects but let's keep it simple
            this.ctx.beginPath(); this.ctx.arc(100, 100, 20, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(120, 110, 25, 0, Math.PI * 2); this.ctx.fill();
        }
    }

    die() {
        this.currentState = STATE.OVER;
        this.isDead = true;
        // Don't stop update immediately if multiplayer!
    }

    updateUI() {
        if (this.scoreEl) this.scoreEl.innerText = this.score;
    }
}

// --- High Level Game Management ---

const mainMenu = document.getElementById('mainMenu');
const gameArea = document.getElementById('gameArea');
const singleMode = document.getElementById('singleMode');
const multiMode = document.getElementById('multiMode');

let games = [];
let gameMode = 'single'; // or 'multi'
let isGameRunning = false;

// Buttons
document.getElementById('btnSingle').addEventListener('click', () => startGame('single'));
document.getElementById('btnMulti').addEventListener('click', () => startGame('multi'));

// Key Listener
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        tryAction('Space');
    }

    if (e.code === 'Enter') {
        e.preventDefault();
        tryAction('Enter');
    }
});

// Touch/Click for Single Player (maps to Space)
window.addEventListener('mousedown', (e) => {
    if (gameMode === 'single') tryAction('Space');
});

function tryAction(key) {
    if (!isGameRunning) return;

    games.forEach(g => {
        // If single player, mapped to Space (or click)
        // If multi player, strict Key mappings
        if (gameMode === 'single') {
            g.flap();
        } else {
            if (g.inputKey === key && !g.isDead) g.flap();
        }
    });
}

function startGame(mode) {
    gameMode = mode;
    mainMenu.classList.add('hidden'); // Hide menu
    gameArea.classList.remove('hidden'); // Show container

    games = []; // Reset instances

    if (mode === 'single') {
        singleMode.classList.remove('hidden');
        multiMode.classList.add('hidden');

        const g = new FlappyEngine('canvasSingle', 'Space', 'scoreSingle');
        g.reset();
        games.push(g);

    } else {
        multiMode.classList.remove('hidden');
        singleMode.classList.add('hidden');

        const g1 = new FlappyEngine('canvasP1', 'Space', 'scoreP1');
        const g2 = new FlappyEngine('canvasP2', 'Enter', 'scoreP2');
        g1.reset();
        g2.reset();
        games.push(g1, g2);
    }

    isGameRunning = true;
    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (!isGameRunning) return;

    let allDead = true;

    games.forEach(g => {
        g.update();
        g.draw();

        if (!g.isDead) allDead = false;
    });

    if (allDead) {
        // Handle Game Over
        isGameRunning = false;
        showGameOver();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function showGameOver() {
    if (gameMode === 'single') {
        document.getElementById('gameOverSingle').classList.remove('hidden');
        document.getElementById('finalScoreSingle').innerText = games[0].score;
    } else {
        document.getElementById('gameOverMulti').classList.remove('hidden');

        const p1Score = games[0].score;
        const p2Score = games[1].score;
        document.getElementById('finalScoreP1').innerText = p1Score;
        document.getElementById('finalScoreP2').innerText = p2Score;

        const winnerText = document.getElementById('winnerText');
        if (p1Score > p2Score) {
            winnerText.innerText = "Player 1 Wins!";
            winnerText.style.color = "#4287f5"; // Blue for P1? P1 has no specific color diff yet, they look same.
        } else if (p2Score > p1Score) {
            winnerText.innerText = "Player 2 Wins!";
            winnerText.style.color = "#f4ce42";
        } else {
            winnerText.innerText = "It's a Draw!";
            winnerText.style.color = "#fff";
        }
    }
}
