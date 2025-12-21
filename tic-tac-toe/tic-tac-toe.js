class TicTacToe {
    constructor() {
        this.board = Array(9).fill('');
        this.gameActive = false;
        this.currentPlayer = 'X';
        this.mode = 'pvp'; // 'pvp' or 'pvc'
        this.difficulty = 'easy';
        this.humanPlayer = 'X';
        this.aiPlayer = 'O';

        // Winning combinations indices
        this.winningConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];

        // Cache DOM elements
        this.screens = {
            start: document.getElementById('start-screen'),
            difficulty: document.getElementById('difficulty-screen'),
            game: document.getElementById('game-screen')
        };
        this.boardElement = document.getElementById('board');
        this.cells = Array.from(document.querySelectorAll('.cell'));
        this.turnIndicator = document.getElementById('turn-indicator');
        this.modal = document.getElementById('result-modal');
        this.resultMessage = document.getElementById('result-message');

        this.init();
    }

    init() {
        this.cells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });
    }

    showScreen(screenId) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
            screen.classList.add('hidden');
        });

        // Use a timeout to allow the fade out animation of previous screen if needed
        // For simplicity, just switching active class
        const target = document.getElementById(screenId);
        target.classList.remove('hidden');
        target.classList.add('active');

        // Note: For smoother transitions we could use requestAnimationFrame or timeouts
        // to manage opacity/display properties but CSS handles basic fade-in.

        // Ensure modal is closed when navigating between screens
        this.modal.classList.remove('visible');
        this.modal.classList.add('hidden');
    }

    selectMode(mode) {
        this.mode = mode;
        if (mode === 'pvc') {
            this.showScreen('difficulty-screen');
        } else {
            this.startGame();
        }
    }

    startGame(difficulty = null) {
        if (difficulty) this.difficulty = difficulty;
        this.board = Array(9).fill('');
        this.gameActive = true;
        this.currentPlayer = 'X';
        this.showScreen('game-screen');
        this.updateBoardUI();
        this.updateStatus();
        this.modal.classList.remove('visible');
        this.modal.classList.add('hidden');
    }

    resetGame() {
        this.startGame(this.difficulty);
    }

    handleCellClick(e) {
        const cell = e.target;
        const index = parseInt(cell.getAttribute('data-index'));

        if (this.board[index] !== '' || !this.gameActive) return;

        // Human Turn
        this.makeMove(index, this.currentPlayer);

        // AI Turn (if active and game not over)
        if (this.gameActive && this.mode === 'pvc' && this.currentPlayer === this.aiPlayer) {
            // Small delay for realism
            setTimeout(() => this.makeAiMove(), 500);
        }
    }

    makeMove(index, player) {
        this.board[index] = player;
        this.updateBoardUI();
        this.checkResult();

        if (this.gameActive) {
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
            this.updateStatus();
        }
    }

    updateBoardUI() {
        this.cells.forEach((cell, index) => {
            cell.textContent = this.board[index];
            cell.className = 'cell'; // Reset classes
            if (this.board[index] !== '') {
                cell.classList.add('taken');
                cell.classList.add(this.board[index].toLowerCase());
            }
        });
    }

    updateStatus() {
        if (this.mode === 'pvc') {
            if (this.currentPlayer === this.humanPlayer) {
                this.turnIndicator.textContent = "Your Turn";
            } else {
                this.turnIndicator.textContent = "Computer is thinking...";
            }
        } else {
            this.turnIndicator.textContent = `Player ${this.currentPlayer}'s Turn`;
        }
    }

    checkResult() {
        let roundWon = false;
        let winningLine = [];

        for (let i = 0; i < this.winningConditions.length; i++) {
            const [a, b, c] = this.winningConditions[i];
            if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                roundWon = true;
                winningLine = [a, b, c];
                break;
            }
        }

        if (roundWon) {
            this.gameActive = false;
            this.announceWinner(this.currentPlayer);
            this.highlightWinningCells(winningLine);
            return;
        }

        if (!this.board.includes('')) {
            this.gameActive = false;
            this.announceWinner('draw');
        }
    }



    highlightWinningCells(indices) {
        indices.forEach(index => {
            this.cells[index].classList.add('winning-cell');
        });
    }

    announceWinner(winner) {
        setTimeout(() => {
            this.modal.classList.remove('hidden');
            // Force reflow
            void this.modal.offsetWidth;
            this.modal.classList.add('visible');

            if (winner === 'draw') {
                this.resultMessage.textContent = "It's a Draw!";
            } else {
                if (this.mode === 'pvc') {
                    if (winner === this.humanPlayer) {
                        this.resultMessage.textContent = "You Won! 🎉";
                    } else {
                        this.resultMessage.textContent = "Computer Wins 🤖";
                    }
                } else {
                    this.resultMessage.textContent = `Player ${winner} Wins! 🎉`;
                }
            }
        }, 800);
    }

    // --- AI LOGIC ---

    makeAiMove() {
        if (!this.gameActive) return;

        let index;
        if (this.difficulty === 'easy') {
            index = this.getRandomMove();
        } else if (this.difficulty === 'medium') {
            // 40% chance of making a random move error, else best move
            if (Math.random() < 0.4) {
                index = this.getRandomMove();
            } else {
                index = this.getBestMove();
            }
        } else {
            // Hard - Unbeatable
            index = this.getBestMove();
        }

        this.makeMove(index, this.aiPlayer);
    }

    getRandomMove() {
        const available = this.board.map((val, idx) => val === '' ? idx : null).filter(val => val !== null);
        return available[Math.floor(Math.random() * available.length)];
    }

    getBestMove() {
        let bestScore = -Infinity;
        let move;

        for (let i = 0; i < 9; i++) {
            if (this.board[i] === '') {
                this.board[i] = this.aiPlayer;
                let score = this.minimax(this.board, 0, false);
                this.board[i] = '';
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    minimax(board, depth, isMaximizing) {
        // Check terminal states
        let result = this.checkWinner(board);
        if (result !== null) {
            return result;
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === '') {
                    board[i] = this.aiPlayer;
                    let score = this.minimax(board, depth + 1, false);
                    board[i] = '';
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === '') {
                    board[i] = this.humanPlayer;
                    let score = this.minimax(board, depth + 1, true);
                    board[i] = '';
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    checkWinner(board) {
        // Returns 10 if AI wins, -10 if Human wins, 0 for draw, null for continue
        for (let i = 0; i < this.winningConditions.length; i++) {
            const [a, b, c] = this.winningConditions[i];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                if (board[a] === this.aiPlayer) return 10;
                if (board[a] === this.humanPlayer) return -10;
            }
        }
        if (!board.includes('')) return 0;
        return null;
    }
}

// Initialize Game
const game = new TicTacToe();
