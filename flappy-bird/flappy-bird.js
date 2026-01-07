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
    constructor(canvasId, inputKey, scoreElementId, highScoreId, labelId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scoreEl = document.getElementById(scoreElementId);
        this.labelEl = labelId ? document.getElementById(labelId) : null;
        
        this.highScoreEl = highScoreId ? document.getElementById(highScoreId) : null;
        this.storageKey = highScoreId ? "flappy_highscore_record" : null;

        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.inputKey = inputKey;

        this.highScore = this.storageKey ? (parseInt(localStorage.getItem(this.storageKey)) || 0) : 0;

        this.currentState = STATE.GET_READY;
        this.frames = 0;
        this.score = 0;
        this.isDead = false;

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
        this.fgX = 0;

        this.bgColor = '#70c5ce';
        this.fgColor = '#ded895';

        this.updateUI();
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
        if (this.labelEl) this.labelEl.classList.remove('hidden');
        this.updateUI();
    }

    flap() {
        if (this.currentState === STATE.GET_READY) {
            this.currentState = STATE.PLAYING;
            // Requirement 4: Vanish text on flap
            if (this.labelEl) this.labelEl.classList.add('hidden');
        }

        if (this.currentState === STATE.PLAYING) {
            this.bird.velocity = -CONFIG.jump;
        }
    }

    update() {
        if (this.currentState === STATE.PLAYING || this.currentState === STATE.GET_READY) {
            this.fgX = (this.fgX - CONFIG.speed) % 20;
        }

        if (this.currentState === STATE.GET_READY) {
            this.bird.y = 150 + Math.cos(this.frames * 0.1) * 5;
            this.bird.rotation = 0;
        } else if (this.currentState === STATE.PLAYING || this.currentState === STATE.OVER) {
            this.bird.velocity += CONFIG.gravity;
            this.bird.y += this.bird.velocity;

            if (this.bird.velocity < 0) this.bird.rotation = -25 * Math.PI / 180;
            else {
                this.bird.rotation += 2 * Math.PI / 180;
                this.bird.rotation = Math.min(Math.PI / 2, this.bird.rotation);
            }

            const floorY = this.height - 112;
            if (this.bird.y + this.bird.radius >= floorY) {
                this.bird.y = floorY - this.bird.radius;
                this.die();
            }
        }

        if (this.currentState === STATE.PLAYING) {
            if (this.frames % CONFIG.pipeInterval === 0) {
                const maxY = -150;
                this.pipes.push({
                    x: this.width,
                    y: maxY * (Math.random() + 1),
                    passed: false
                });
            }

            for (let i = 0; i < this.pipes.length; i++) {
                let p = this.pipes[i];
                p.x -= CONFIG.speed;

                const pipeW = 52;
                const pipeH = 400;
                const bottomY = p.y + pipeH + CONFIG.pipeGap;

                let birdLeft = this.bird.x - this.bird.radius;
                let birdRight = this.bird.x + this.bird.radius;
                let birdTop = this.bird.y - this.bird.radius;
                let birdBottom = this.bird.y + this.bird.radius;

                if (birdRight > p.x && birdLeft < p.x + pipeW) {
                    if (birdTop < p.y + pipeH || birdBottom > bottomY) {
                        this.die();
                    }
                }

                if (p.x + pipeW < this.bird.x && !p.passed) {
                    this.score++;
                    p.passed = true;
                    this.updateUI();
                }

                if (p.x + pipeW < 0) {
                    this.pipes.shift();
                    i--;
                }
            }
        }

        this.bird.frame += this.frames % 5 === 0 ? 1 : 0;
        this.bird.frame %= 4;
        this.frames++;
    }

    draw() {
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawClouds();

        for (let p of this.pipes) {
            this.drawPipe(p.x, p.y);
        }

        this.ctx.fillStyle = this.fgColor;
        this.ctx.fillRect(0, this.height - 112, this.width, 112);

        this.ctx.strokeStyle = '#d0c874';
        this.ctx.lineWidth = 2;
        for (let i = -20; i < this.width; i += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(i + this.fgX, this.height - 112);
            this.ctx.lineTo(i + this.fgX - 10, this.height);
            this.ctx.stroke();
        }

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height - 112);
        this.ctx.lineTo(this.width, this.height - 112);
        this.ctx.strokeStyle = '#555';
        this.ctx.stroke();

        this.drawBird();

        // Requirement 2: Press Space to Start text for Single Player
        if (this.currentState === STATE.GET_READY && this.width > 500) {
            this.ctx.fillStyle = "#FFF";
            this.ctx.font = "20px 'Press Start 2P'";
            this.ctx.textAlign = "center";
            this.ctx.fillText("Press Space to Start", this.width / 2, this.height / 2 + 50);
        }
    }

    drawPipe(x, y) {
        const w = 52;
        const h = 400;
        const gap = CONFIG.pipeGap;

        this.ctx.fillStyle = '#73bf2e';
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;

        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeRect(x, y, w, h);
        this.ctx.fillRect(x - 2, y + h - 20, w + 4, 20);
        this.ctx.strokeRect(x - 2, y + h - 20, w + 4, 20);

        let by = y + h + gap;
        this.ctx.fillRect(x, by, w, h);
        this.ctx.strokeRect(x, by, w, h);
        this.ctx.fillRect(x - 2, by, w + 4, 20);
        this.ctx.strokeRect(x - 2, by, w + 4, 20);
    }

    drawBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x, this.bird.y);
        this.ctx.rotate(this.bird.rotation);

        this.ctx.fillStyle = "#f4ce42";
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = "#000";
        this.ctx.stroke();

        this.ctx.fillStyle = "#FFF";
        this.ctx.beginPath();
        this.ctx.arc(6, -6, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = "#000";
        this.ctx.beginPath();
        this.ctx.arc(8, -6, 2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = "#e8e5c5";
        this.ctx.beginPath();
        this.ctx.ellipse(-4, 2, 6, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

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
        if (this.frames % 1000 < 500) {
            this.ctx.beginPath(); this.ctx.arc(100, 100, 20, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(120, 110, 25, 0, Math.PI * 2); this.ctx.fill();
        }
    }

    die() {
        if (this.currentState !== STATE.OVER) {
            this.currentState = STATE.OVER;
            this.isDead = true;

            if (this.storageKey && this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem(this.storageKey, this.highScore);
            }
            this.updateUI();
        }
    }

    updateUI() {
        if (this.scoreEl) this.scoreEl.innerText = this.score;
        if (this.highScoreEl) this.highScoreEl.innerText = this.highScore;
    }
}

// --- High Level Game Management ---

const mainMenu = document.getElementById('mainMenu');
const gameArea = document.getElementById('gameArea');
const singleMode = document.getElementById('singleMode');
const multiMode = document.getElementById('multiMode');

let games = [];
let gameMode = 'single';
let isGameRunning = false;

document.getElementById('btnSingle').addEventListener('click', () => startGame('single'));
document.getElementById('btnMulti').addEventListener('click', () => startGame('multi'));

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

window.addEventListener('mousedown', (e) => {
    if (gameMode === 'single') tryAction('Space');
});

function tryAction(key) {
    // Requirement 3: Restart if Space/Enter pressed during Game Over
    if (!isGameRunning) {
        const isGameOverScreenVisible = !document.getElementById('gameOverSingle').classList.contains('hidden') || 
                                        !document.getElementById('gameOverMulti').classList.contains('hidden');
        
        if (isGameOverScreenVisible && (key === 'Space' || key === 'Enter')) {
            // Hide Game Over screens and restart
            document.getElementById('gameOverSingle').classList.add('hidden');
            document.getElementById('gameOverMulti').classList.add('hidden');
            startGame(gameMode);
            return;
        }
        return;
    }

    games.forEach(g => {
        if (gameMode === 'single') {
            g.flap();
        } else {
            if (g.inputKey === key && !g.isDead) g.flap();
        }
    });
}

function startGame(mode) {
    gameMode = mode;
    mainMenu.classList.add('hidden');
    gameArea.classList.remove('hidden');

    games = []; 

    if (mode === 'single') {
        singleMode.classList.remove('hidden');
        multiMode.classList.add('hidden');

        const g = new FlappyEngine('canvasSingle', 'Space', 'scoreSingle', 'highScoreSingle');
        g.reset();
        games.push(g);

    } else {
        multiMode.classList.remove('hidden');
        singleMode.classList.add('hidden');

        const g1 = new FlappyEngine('canvasP1', 'Space', 'scoreP1', null, 'labelP1');
        const g2 = new FlappyEngine('canvasP2', 'Enter', 'scoreP2', null, 'labelP2');
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
        isGameRunning = false;
        showGameOver();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function showGameOver() {
    if (gameMode === 'single') {
        const g = games[0];
        document.getElementById('gameOverSingle').classList.remove('hidden');
        document.getElementById('finalScoreSingle').innerText = g.score;
        document.getElementById('bestScoreSingle').innerText = g.highScore;
    } else {
        document.getElementById('gameOverMulti').classList.remove('hidden');

        const p1Score = games[0].score;
        const p2Score = games[1].score;
        document.getElementById('finalScoreP1').innerText = p1Score;
        document.getElementById('finalScoreP2').innerText = p2Score;

        const winnerText = document.getElementById('winnerText');
        
        if (p1Score > p2Score) {
            winnerText.innerText = "Player 1 Wins!";
            winnerText.style.color = "#4287f5";
        } else if (p2Score > p1Score) {
            winnerText.innerText = "Player 2 Wins!";
            winnerText.style.color = "#f4ce42";
        } else {
            winnerText.innerText = "It's a Draw!";
            winnerText.style.color = "#fff";
        }
    }
}