// Constants
const PIECES = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

const PIECE_VALUES = {
    p: 10, n: 30, b: 30, r: 50, q: 90, k: 900
};

const BOARD_SIZE = 8;
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

class ChessGame {
    constructor() {
        this.board = [];
        this.turn = 'w';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.history = [];
        this.isGameOver = false;

        this.initBoard();
        this.renderBoard();
        this.setupEventListeners();
    }

    initBoard() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        const initialSetup = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            Array(8).fill(null), Array(8).fill(null),
            Array(8).fill(null), Array(8).fill(null),
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const char = initialSetup[r][c];
                if (char) {
                    const color = char === char.toUpperCase() ? 'w' : 'b';
                    const type = char.toLowerCase();
                    this.board[r][c] = { type, color };
                }
            }
        }
    }

    renderBoard() {
        const boardEl = document.getElementById('chess-board');
        boardEl.innerHTML = '';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.classList.add((r + c) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = r;
                square.dataset.col = c;
                square.id = `${FILES[c]}${RANKS[r]}`;

                const piece = this.board[r][c];
                if (piece) {
                    const pieceEl = document.createElement('div');
                    pieceEl.classList.add('piece');
                    pieceEl.classList.add(piece.color === 'w' ? 'white' : 'black');
                    pieceEl.textContent = PIECES[piece.color][piece.type];
                    square.appendChild(pieceEl);
                }

                if (this.selectedSquare && this.selectedSquare.r === r && this.selectedSquare.c === c) {
                    square.classList.add('selected');
                }

                if (this.legalMoves.some(m => m.r === r && m.c === c)) {
                    square.classList.add('highlight');
                }

                boardEl.appendChild(square);
            }
        }
        this.updateStatus();
    }

    setupEventListeners() {
        document.getElementById('chess-board').addEventListener('click', (e) => this.handleBoardClick(e));
        document.getElementById('new-game-btn').addEventListener('click', () => this.resetGame());

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        document.getElementById('game-mode').addEventListener('change', (e) => {
            const difficultyGroup = document.getElementById('difficulty-group');
            difficultyGroup.style.display = e.target.value === 'ai' ? 'flex' : 'none';
        });
    }

    handleBoardClick(e) {
        if (this.isGameOver) return;
        const square = e.target.closest('.square');
        if (!square) return;

        const r = parseInt(square.dataset.row);
        const c = parseInt(square.dataset.col);
        this.handleSquareClick(r, c);
    }

    handleSquareClick(r, c) {
        const clickedPiece = this.board[r][c];
        const move = this.legalMoves.find(m => m.r === r && m.c === c);

        if (move) {
            this.makeMove(move);
        } else if (clickedPiece && clickedPiece.color === this.turn) {
            this.selectedSquare = { r, c };
            this.legalMoves = this.getSafeMoves(r, c); // Use Safe Moves
            this.renderBoard();
        } else {
            this.selectedSquare = null;
            this.legalMoves = [];
            this.renderBoard();
        }
    }

    isSquareEmpty(board, r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === null;
    }

    isOpponent(board, r, c, color) {
        return r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] !== null && board[r][c].color !== color;
    }

    // Returns all pseudo-legal moves (ignoring checks)
    getPseudoMoves(board, r, c) {
        const piece = board[r][c];
        if (!piece) return [];
        const moves = [];
        const { type, color } = piece;

        const addMove = (tr, tc) => {
            if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
                moves.push({ fromR: r, fromC: c, r: tr, c: tc });
            }
        };

        if (type === 'p') {
            const dir = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;
            if (this.isSquareEmpty(board, r + dir, c)) {
                addMove(r + dir, c);
                if (r === startRow && this.isSquareEmpty(board, r + 2 * dir, c)) {
                    addMove(r + 2 * dir, c);
                }
            }
            if (this.isOpponent(board, r + dir, c - 1, color)) addMove(r + dir, c - 1);
            if (this.isOpponent(board, r + dir, c + 1, color)) addMove(r + dir, c + 1);
        }

        if (['r', 'b', 'q'].includes(type)) {
            const directions = [];
            if (['r', 'q'].includes(type)) directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
            if (['b', 'q'].includes(type)) directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);

            for (const [dr, dc] of directions) {
                let nr = r + dr, nc = c + dc;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    if (board[nr][nc] === null) {
                        addMove(nr, nc);
                    } else {
                        if (board[nr][nc].color !== color) addMove(nr, nc);
                        break;
                    }
                    nr += dr;
                    nc += dc;
                }
            }
        }

        if (type === 'n') {
            const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            jumps.forEach(([dr, dc]) => {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    if (board[nr][nc] === null || board[nr][nc].color !== color) addMove(nr, nc);
                }
            });
        }

        if (type === 'k') {
            const steps = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            steps.forEach(([dr, dc]) => {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    if (board[nr][nc] === null || board[nr][nc].color !== color) addMove(nr, nc);
                }
            });
        }

        return moves;
    }

    getSafeMoves(r, c) {
        const moves = this.getPseudoMoves(this.board, r, c);
        return moves.filter(move => {
            const simulatedBoard = this.cloneBoard(this.board);
            this.applyMove(simulatedBoard, move);
            return !this.isKingInCheck(simulatedBoard, this.turn);
        });
    }

    getAllSafeMoves(board, color) {
        let moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.color === color) {
                    moves = moves.concat(this.getSafeMoves(r, c));
                }
            }
        }
        return moves;
    }

    cloneBoard(board) {
        return board.map(row => row.map(piece => piece ? { ...piece } : null));
    }

    applyMove(board, move) {
        board[move.r][move.c] = board[move.fromR][move.fromC];
        board[move.fromR][move.fromC] = null;
    }

    isKingInCheck(board, color) {
        let kingPos;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] && board[r][c].type === 'k' && board[r][c].color === color) {
                    kingPos = { r, c };
                    break;
                }
            }
        }
        if (!kingPos) return true; // Should ideally not happen

        // Check if any opponent piece can hit King
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.color !== color) {
                    // We use pseudo moves here to see if king can be captured
                    const moves = this.getPseudoMoves(board, r, c);
                    if (moves.some(m => m.r === kingPos.r && m.c === kingPos.c)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    makeMove(move) {
        const piece = this.board[move.fromR][move.fromC];
        this.applyMove(this.board, move);

        // Promotion (Auto Queen)
        if (piece.type === 'p' && (move.r === 0 || move.r === 7)) {
            this.board[move.r][move.c].type = 'q';
        }

        this.turn = this.turn === 'w' ? 'b' : 'w';
        this.selectedSquare = null;
        this.legalMoves = [];
        this.renderBoard();

        // Check Game Over
        if (this.getAllSafeMoves(this.board, this.turn).length === 0) {
            if (this.isKingInCheck(this.board, this.turn)) {
                alert(`Checkmate! ${this.turn === 'w' ? 'Black' : 'White'} wins!`);
            } else {
                alert("Stalemate! It's a draw.");
            }
            this.isGameOver = true;
            this.updateStatus();
            return;
        }

        if (this.turn === 'b' && document.getElementById('game-mode').value === 'ai') {
            setTimeout(() => this.makeAIMove(), 100);
        }
        this.updateStatus();
    }

    // --- AI LOGIC ---

    evaluateBoard(board) {
        let score = 0;
        let whiteMobility = 0, blackMobility = 0;
        let whitePawnStructure = 0, blackPawnStructure = 0;
        let whiteKingSafety = 0, blackKingSafety = 0;
        // Central squares for positional bonus
        const centralSquares = [
            [3, 3], [3, 4], [4, 3], [4, 4]
        ];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece) {
                    const value = PIECE_VALUES[piece.type];
                    // Material
                    score += piece.color === 'w' ? value : -value;
                    // Central control
                    if (centralSquares.some(([cr, cc]) => cr === r && cc === c)) {
                        score += piece.color === 'w' ? 5 : -5;
                    }
                    // Mobility
                    const moves = this.getPseudoMoves(board, r, c).length;
                    if (piece.color === 'w') whiteMobility += moves;
                    else blackMobility += moves;
                    // Pawn structure
                    if (piece.type === 'p') {
                        // Isolated pawn penalty
                        let isolated = true;
                        for (let dc of [-1, 1]) {
                            if (c + dc >= 0 && c + dc < 8 && board[r][c + dc] && board[r][c + dc].type === 'p' && board[r][c + dc].color === piece.color) {
                                isolated = false;
                                break;
                            }
                        }
                        if (isolated) {
                            if (piece.color === 'w') whitePawnStructure -= 5;
                            else blackPawnStructure += 5;
                        }
                        // Doubled pawn penalty
                        let doubled = false;
                        for (let rr = 0; rr < 8; rr++) {
                            if (rr !== r && board[rr][c] && board[rr][c].type === 'p' && board[rr][c].color === piece.color) {
                                doubled = true;
                                break;
                            }
                        }
                        if (doubled) {
                            if (piece.color === 'w') whitePawnStructure -= 3;
                            else blackPawnStructure += 3;
                        }
                    }
                    // King safety (simple: penalize exposed king)
                    if (piece.type === 'k') {
                        let safe = true;
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                if (dr === 0 && dc === 0) continue;
                                const nr = r + dr, nc = c + dc;
                                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                                    if (board[nr][nc] && board[nr][nc].color !== piece.color) {
                                        safe = false;
                                    }
                                }
                            }
                        }
                        if (!safe) {
                            if (piece.color === 'w') whiteKingSafety -= 10;
                            else blackKingSafety += 10;
                        }
                    }
                }
            }
        }
        // Add mobility and pawn structure bonuses
        score += (whiteMobility - blackMobility) * 0.5;
        score += (whitePawnStructure - blackPawnStructure);
        score += (whiteKingSafety - blackKingSafety);
        return score; // Positive for White advantage
    }

    // Move ordering: prioritize captures and checks
    orderMoves(board, moves, color) {
        return moves.sort((a, b) => {
            const pieceA = board[a.r][a.c];
            const pieceB = board[b.r][b.c];
            // Captures first
            const captureA = board[a.r][a.c] && board[a.r][a.c].color !== color;
            const captureB = board[b.r][b.c] && board[b.r][b.c].color !== color;
            if (captureA && !captureB) return -1;
            if (!captureA && captureB) return 1;
            // Checks next
            const simBoardA = this.cloneBoard(board);
            this.applyMove(simBoardA, a);
            const simBoardB = this.cloneBoard(board);
            this.applyMove(simBoardB, b);
            const checkA = this.isKingInCheck(simBoardA, color === 'w' ? 'b' : 'w');
            const checkB = this.isKingInCheck(simBoardB, color === 'w' ? 'b' : 'w');
            if (checkA && !checkB) return -1;
            if (!checkA && checkB) return 1;
            return 0;
        });
    }

    minimax(board, depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return this.evaluateBoard(board);
        }
        const color = isMaximizing ? 'w' : 'b';
        let moves = this.getAllSafeMovesForBoard(board, color);
        moves = this.orderMoves(board, moves, color);
        if (moves.length === 0) {
            if (this.isKingInCheck(board, color)) {
                return isMaximizing ? -10000 : 10000; // Checkmate
            }
            return 0; // Stalemate
        }
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const newBoard = this.cloneBoard(board);
                this.applyMove(newBoard, move);
                const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const newBoard = this.cloneBoard(board);
                this.applyMove(newBoard, move);
                const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    getAllSafeMovesForBoard(board, color) {
        // Standalone safe move generator
        let moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece && piece.color === color) {
                    const pseudoMoves = this.getPseudoMoves(board, r, c);
                    const validMoves = pseudoMoves.filter(m => {
                        const simBoard = this.cloneBoard(board);
                        this.applyMove(simBoard, m);
                        return !this.isKingInCheck(simBoard, color);
                    });
                    moves = moves.concat(validMoves);
                }
            }
        }
        return moves;
    }

    makeAIMove() {
        if (this.isGameOver) return;
        const difficulty = document.getElementById('difficulty').value;
        const moves = this.getAllSafeMoves(this.board, 'b');

        if (moves.length === 0) return;

        let bestMove = moves[0];

        if (difficulty === 'easy') {
            bestMove = moves[Math.floor(Math.random() * moves.length)];
        }
        else if (difficulty === 'medium') {
            // Greedy: capture high value pieces
            let minScore = Infinity;
            moves.forEach(move => {
                const simBoard = this.cloneBoard(this.board);
                this.applyMove(simBoard, move);
                const score = this.evaluateBoard(simBoard); // AI is black, wants negative score
                if (score < minScore) {
                    minScore = score;
                    bestMove = move;
                }
            });
        }
        else { // Hard - Minimax
            let minEval = Infinity;
            const depth = 3; // Keep depth low for browser performance
            for (const move of moves) {
                const newBoard = this.cloneBoard(this.board);
                this.applyMove(newBoard, move);
                const evalVal = this.minimax(newBoard, depth - 1, -Infinity, Infinity, true); // Next is White (Max)
                if (evalVal < minEval) {
                    minEval = evalVal;
                    bestMove = move;
                }
            }
        }

        this.makeMove(bestMove);
    }

    resetGame() {
        this.board = [];
        this.turn = 'w';
        this.isGameOver = false;
        this.legalMoves = [];
        this.selectedSquare = null;
        this.initBoard();
        this.renderBoard();
        document.getElementById('status-display').textContent = "White's Turn";
    }

    updateStatus() {
        if (this.isGameOver) return;
        const text = this.turn === 'w' ? "White's Turn" : "Black's Turn";
        const statusEl = document.getElementById('status-display');
        statusEl.textContent = text;

        if (this.isKingInCheck(this.board, this.turn)) {
            statusEl.textContent += " (CHECK)";
            statusEl.style.color = '#e94560';
        } else {
            statusEl.style.color = 'var(--text-color)';
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new ChessGame();
});
