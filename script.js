// ==========================================
// TETRIS MOBILE - Complete Game Implementation
// ==========================================

// Canvas and Context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');

// Game Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// Set canvas dimensions
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Tetromino Colors
const COLORS = {
    I: '#00f5ff',
    O: '#ffeb3b',
    T: '#e040fb',
    S: '#76ff03',
    Z: '#ff1744',
    J: '#2979ff',
    L: '#ff9100',
    ghost: 'rgba(255, 255, 255, 0.2)'
};

// Tetromino Shapes
const PIECES = {
    I: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    O: [[1,1], [1,1]],
    T: [[0,1,0], [1,1,1], [0,0,0]],
    S: [[0,1,1], [1,1,0], [0,0,0]],
    Z: [[1,1,0], [0,1,1], [0,0,0]],
    J: [[1,0,0], [1,1,1], [0,0,0]],
    L: [[0,0,1], [1,1,1], [0,0,0]]
};

// Wall Kick Data (SRS - Super Rotation System)
const WALL_KICKS = {
    normal: {
        '0>1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
        '1>0': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
        '1>2': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
        '2>1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
        '2>3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
        '3>2': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
        '3>0': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
        '0>3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]]
    },
    I: {
        '0>1': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
        '1>0': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
        '1>2': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
        '2>1': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
        '2>3': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
        '3>2': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
        '3>0': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
        '0>3': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]]
    }
};

// Game State
let gameState = {
    arena: createMatrix(COLS, ROWS),
    player: {
        pos: { x: 0, y: 0 },
        matrix: null,
        type: null,
        rotation: 0
    },
    nextPiece: null,
    holdPiece: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    best: parseInt(localStorage.getItem('tetrisBest')) || 0,
    dropCounter: 0,
    dropInterval: 1000,
    lastTime: 0,
    isPaused: false,
    isGameOver: false,
    isRunning: false,
    mode: 'Marathon',
    sprintLines: 40,
    sprintPieces: 0,
    piecesCounter: 0,
    lineClearTimer: 0,
    lineClearText: '',
    pendingLineClearRows: [],
    wasPausedBeforeSettings: false,
    holdEnabled: true,
    speedLevel: 5,
    bag: []
};

// ==========================================
// MATRIX FUNCTIONS
// ==========================================

function createMatrix(w, h) {
    return Array.from({ length: h }, () => Array(w).fill(0));
}

function rotateMatrix(matrix, dir) {
    const N = matrix.length;
    const M = matrix[0].length;
    const result = Array.from({ length: M }, () => Array(N).fill(0));
    
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < M; x++) {
            if (dir > 0) {
                result[x][N - 1 - y] = matrix[y][x];
            } else {
                result[M - 1 - x][y] = matrix[y][x];
            }
        }
    }
    return result;
}

// ==========================================
// PIECE GENERATION (7-Bag Randomizer)
// ==========================================

function fillBag() {
    const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    // Fisher-Yates shuffle
    for (let i = pieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return pieces;
}

function getNextPiece() {
    if (gameState.bag.length === 0) {
        gameState.bag = fillBag();
    }
    return gameState.bag.pop();
}

// ==========================================
// COLLISION DETECTION
// ==========================================

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// ==========================================
// DRAWING FUNCTIONS
// ==========================================

function drawBlock(context, x, y, color, size = BLOCK_SIZE, alpha = 1) {
    const padding = 1;
    context.globalAlpha = alpha;
    
    // Main block
    context.fillStyle = color;
    context.fillRect(
        x * size + padding,
        y * size + padding,
        size - padding * 2,
        size - padding * 2
    );
    
    // Highlight (top-left)
    context.fillStyle = 'rgba(255, 255, 255, 0.3)';
    context.fillRect(
        x * size + padding,
        y * size + padding,
        size - padding * 2,
        3
    );
    context.fillRect(
        x * size + padding,
        y * size + padding,
        3,
        size - padding * 2
    );
    
    // Shadow (bottom-right)
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fillRect(
        x * size + padding,
        y * size + size - padding - 3,
        size - padding * 2,
        3
    );
    context.fillRect(
        x * size + size - padding - 3,
        y * size + padding,
        3,
        size - padding * 2
    );
    
    context.globalAlpha = 1;
}

function drawMatrix(context, matrix, offset, colorKey, blockSize = BLOCK_SIZE) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Always look up color from COLORS object using the piece type
                const color = COLORS[colorKey] || colorKey;
                drawBlock(context, x + offset.x, y + offset.y, color, blockSize);
            }
        });
    });
}

function drawGhostPiece() {
    const player = gameState.player;
    if (!player.matrix) return;
    
    let ghostY = player.pos.y;
    while (!collide(gameState.arena, { pos: { x: player.pos.x, y: ghostY + 1 }, matrix: player.matrix })) {
        ghostY++;
    }
    
    if (ghostY !== player.pos.y) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(ctx, x + player.pos.x, y + ghostY, COLORS.ghost, BLOCK_SIZE, 0.3);
                }
            });
        });
    }
}

function drawArena() {
    gameState.arena.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(ctx, x, y, value);
            }
        });
    });
}

function drawPreview(context, pieceType, canvasEl) {
    const previewBlockSize = 18;
    context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    
    if (!pieceType || !PIECES[pieceType]) return;
    
    const matrix = PIECES[pieceType];
    const color = COLORS[pieceType];
    const occupied = [];

    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                occupied.push({ x, y });
            }
        });
    });

    if (occupied.length === 0) return;

    const minX = Math.min(...occupied.map(cell => cell.x));
    const maxX = Math.max(...occupied.map(cell => cell.x));
    const minY = Math.min(...occupied.map(cell => cell.y));
    const maxY = Math.max(...occupied.map(cell => cell.y));
    const pieceWidth = (maxX - minX + 1) * previewBlockSize;
    const pieceHeight = (maxY - minY + 1) * previewBlockSize;
    const offsetX = (canvasEl.width - pieceWidth) / 2 - minX * previewBlockSize;
    const offsetY = (canvasEl.height - pieceHeight) / 2 - minY * previewBlockSize;
    
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const padding = 1;
                context.fillStyle = color;
                context.globalAlpha = 0.9;
                context.fillRect(
                    offsetX + x * previewBlockSize + padding,
                    offsetY + y * previewBlockSize + padding,
                    previewBlockSize - padding * 2,
                    previewBlockSize - padding * 2
                );
                context.globalAlpha = 1;
            }
        });
    });
}

function draw() {
    // Clear game canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines (subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 1; x < COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    for (let y = 1; y < ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }
    
    drawArena();
    drawGhostPiece();
    
    if (gameState.player.matrix) {
        drawMatrix(ctx, gameState.player.matrix, gameState.player.pos, gameState.player.type);
    }

    if (gameState.lineClearTimer > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.lineClearText, canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }
}

// ==========================================
// GAME LOGIC
// ==========================================

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = COLORS[player.type];
            }
        });
    });
}

function playerReset() {
    const pieceType = gameState.nextPiece || getNextPiece();
    gameState.nextPiece = getNextPiece();
    
    gameState.player.type = pieceType;
    gameState.player.matrix = PIECES[pieceType].map(row => [...row]);
    gameState.player.rotation = 0;
    gameState.player.pos.y = 0;
    gameState.player.pos.x = Math.floor(COLS / 2) - Math.floor(PIECES[pieceType][0].length / 2);
    gameState.canHold = true;
    
    // Check for game over
    if (collide(gameState.arena, gameState.player)) {
        gameState.isGameOver = true;
        gameState.isRunning = false;
        
        // Update best score
        if (gameState.score > gameState.best) {
            gameState.best = gameState.score;
            localStorage.setItem('tetrisBest', gameState.best);
        }
        
        showGameOver();
    }
    
    // Update next piece preview
    drawPreview(nextCtx, gameState.nextPiece, nextCanvas);
}

function playerDrop() {
    gameState.player.pos.y++;
    if (collide(gameState.arena, gameState.player)) {
        gameState.player.pos.y--;
        merge(gameState.arena, gameState.player);
        
        if (gameState.mode === 'Sprint' && gameState.sprintPieces > 0) {
            gameState.piecesCounter++;
            checkSprintPieces();
        }
        
        const linesCleared = arenaSweep();
        if (linesCleared === 0) {
            playerReset();
        }
        updateScore();
    }
    gameState.dropCounter = 0;
}

function playerHardDrop() {
    let dropped = 0;
    while (!collide(gameState.arena, { pos: { x: gameState.player.pos.x, y: gameState.player.pos.y + 1 }, matrix: gameState.player.matrix })) {
        gameState.player.pos.y++;
        dropped++;
    }
    
    // Add bonus points for hard drop
    gameState.score += dropped * 2;
    
    merge(gameState.arena, gameState.player);
    
    if (gameState.mode === 'Sprint' && gameState.sprintPieces > 0) {
        gameState.piecesCounter++;
        checkSprintPieces();
    }
    
    const linesCleared = arenaSweep();
    if (linesCleared === 0) {
        playerReset();
    }
    updateScore();
}

function playerMove(dir) {
    gameState.player.pos.x += dir;
    if (collide(gameState.arena, gameState.player)) {
        gameState.player.pos.x -= dir;
    }
}

function playerRotate(dir) {
    const player = gameState.player;
    const oldRotation = player.rotation;
    const newRotation = (oldRotation + dir + 4) % 4;
    
    // Store original state for revert
    const originalMatrix = player.matrix.map(row => [...row]);
    const originalPos = { ...player.pos };
    
    // Rotate current matrix (not from base)
    player.matrix = rotateMatrix(player.matrix, dir);
    player.rotation = newRotation;
    
    // Get wall kick data - handle all rotation transitions
    let kickKey = `${oldRotation}>${newRotation}`;
    
    // Handle 180 degree rotations (0->2, 2->0, 1->3, 3->1)
    if (!WALL_KICKS.normal[kickKey]) {
        // For 180 degree, use the appropriate kick data
        if (oldRotation === 0 && newRotation === 2) kickKey = '0>1'; // Use CW kick
        else if (oldRotation === 2 && newRotation === 0) kickKey = '2>1';
        else if (oldRotation === 1 && newRotation === 3) kickKey = '1>2';
        else if (oldRotation === 3 && newRotation === 1) kickKey = '3>2';
    }
    
    const kickTable = player.type === 'I' ? WALL_KICKS.I : WALL_KICKS.normal;
    const kickData = kickTable[kickKey];
    
    if (kickData) {
        for (const [kickX, kickY] of kickData) {
            player.pos.x = originalPos.x + kickX;
            player.pos.y = originalPos.y - kickY;
            
            if (!collide(gameState.arena, player)) {
                return; // Success!
            }
        }
    } else {
        // No kick data, just try original position
        if (!collide(gameState.arena, player)) {
            return;
        }
    }
    
    // Revert if no valid position found
    player.matrix = originalMatrix;
    player.rotation = oldRotation;
    player.pos = originalPos;
}

function playerHold() {
    if (!gameState.canHold || !gameState.holdEnabled) return;
    
    const currentType = gameState.player.type;
    
    if (gameState.holdPiece === null) {
        gameState.holdPiece = currentType;
        drawPreview(holdCtx, gameState.holdPiece, holdCanvas);
        playerReset();
    } else {
        const heldType = gameState.holdPiece;
        gameState.holdPiece = currentType;
        gameState.player.type = heldType;
        gameState.player.matrix = PIECES[heldType].map(row => [...row]);
        gameState.player.rotation = 0;
        gameState.player.pos.y = 0;
        gameState.player.pos.x = Math.floor(COLS / 2) - Math.floor(PIECES[heldType][0].length / 2);
        drawPreview(holdCtx, gameState.holdPiece, holdCanvas);
    }
    
    gameState.canHold = false;
}

function arenaSweep() {
    const fullRows = [];
    
    outer: for (let y = gameState.arena.length - 1; y >= 0; y--) {
        for (let x = 0; x < gameState.arena[y].length; x++) {
            if (gameState.arena[y][x] === 0) {
                continue outer;
            }
        }
        fullRows.push(y);
    }
    
    if (fullRows.length > 0) {
        gameState.pendingLineClearRows = fullRows;
        
        // Scoring: 100, 300, 500, 800 (times level)
        const lineScores = [0, 100, 300, 500, 800];
        gameState.score += lineScores[fullRows.length] * gameState.level;
        gameState.lines += fullRows.length;
        
        // Level up every 10 lines
        gameState.level = Math.floor(gameState.lines / 10) + 1;
        
        // Update speed based on level and speed setting
        updateDropInterval();
        
        gameState.lineClearText = `${fullRows.length} LINE${fullRows.length === 1 ? '' : 'S'} CLEARED`;
        gameState.lineClearTimer = 800;
        
        if (gameState.mode === 'Sprint') {
            checkSprintWin();
        }
        
        return fullRows.length;
    }
    return 0;
}

function finalizeLineClear() {
    if (gameState.pendingLineClearRows.length === 0) return;
    
    for (let i = gameState.pendingLineClearRows.length - 1; i >= 0; i--) {
        const y = gameState.pendingLineClearRows[i];
        const row = gameState.arena.splice(y, 1)[0].fill(0);
        gameState.arena.unshift(row);
    }
    
    gameState.pendingLineClearRows = [];
    gameState.lineClearTimer = 0;
    gameState.lineClearText = '';
    playerReset();
}

function checkSprintWin() {
    if (gameState.lines >= gameState.sprintLines) {
        gameState.isGameOver = true;
        gameState.isRunning = false;
        
        // Bonus for remaining pieces
        if (gameState.sprintPieces > 0) {
            const remaining = gameState.sprintPieces - gameState.piecesCounter;
            if (remaining > 0) {
                gameState.score += remaining * 10;
            }
        }
        
        if (gameState.score > gameState.best) {
            gameState.best = gameState.score;
            localStorage.setItem('tetrisBest', gameState.best);
        }
        
        showGameOver(true);
    }
}

function checkSprintPieces() {
    if (gameState.sprintPieces > 0 && gameState.piecesCounter >= gameState.sprintPieces) {
        gameState.isGameOver = true;
        gameState.isRunning = false;
        
        if (gameState.score > gameState.best) {
            gameState.best = gameState.score;
            localStorage.setItem('tetrisBest', gameState.best);
        }
        
        showGameOver(false, 'PIECES EXHAUSTED');
    }
}

function updateDropInterval() {
    // Base interval decreases with level, modified by speed setting
    const baseInterval = Math.max(50, 1000 - (gameState.level - 1) * 80);
    const speedMultiplier = 1.2 - (gameState.speedLevel * 0.02);
    gameState.dropInterval = Math.max(30, Math.floor(baseInterval * speedMultiplier));
}

// ==========================================
// UI UPDATES
// ==========================================

function updateScore() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('best').textContent = gameState.best;
    document.getElementById('lines-display').textContent = `LINES: ${gameState.lines}`;
}

function showStartScreen() {
    document.getElementById('start-overlay').classList.remove('hidden');
    document.getElementById('game-overlay').classList.add('hidden');
}

function showGameOver(isWin = false, customTitle = null) {
    const overlay = document.getElementById('game-overlay');
    const title = document.getElementById('overlay-title');
    const message = document.getElementById('overlay-message');
    const resumeBtn = document.getElementById('resume-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    resumeBtn.classList.add('hidden');
    restartBtn.textContent = 'PLAY AGAIN';
    
    if (customTitle) {
        title.textContent = customTitle;
        title.style.color = '#ff6b6b';
    } else if (isWin) {
        title.textContent = 'YOU WIN!';
        title.style.color = '#00ff88';
    } else {
        title.textContent = 'GAME OVER';
        title.style.color = '#ff6b6b';
    }
    
    message.textContent = `Final Score: ${gameState.score}`;
    overlay.classList.remove('hidden');
}

function togglePause() {
    if (!gameState.isRunning || gameState.isGameOver) return;
    
    gameState.isPaused = !gameState.isPaused;
    const overlay = document.getElementById('game-overlay');
    const title = document.getElementById('overlay-title');
    const message = document.getElementById('overlay-message');
    const resumeBtn = document.getElementById('resume-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    if (gameState.isPaused) {
        title.textContent = 'PAUSED';
        title.style.color = '#00d4ff';
        message.textContent = 'Tap CONTINUE to resume the game.';
        resumeBtn.classList.remove('hidden');
        restartBtn.textContent = 'RESTART';
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function hideOverlays() {
    document.getElementById('start-overlay').classList.add('hidden');
    document.getElementById('game-overlay').classList.add('hidden');
    document.getElementById('resume-btn').classList.add('hidden');
}

// ==========================================
// GAME LOOP
// ==========================================

function update(time = 0) {
    if (!gameState.isRunning) return;
    
    const deltaTime = time - gameState.lastTime;
    gameState.lastTime = time;
    
    if (gameState.lineClearTimer > 0) {
        gameState.lineClearTimer -= deltaTime;
        if (gameState.lineClearTimer <= 0) {
            finalizeLineClear();
        }
    } else if (!gameState.isPaused && !gameState.isGameOver) {
        gameState.dropCounter += deltaTime;
        if (gameState.dropCounter > gameState.dropInterval) {
            playerDrop();
        }
    }
    
    draw();
    requestAnimationFrame(update);
}

function startGame() {
    // Reset game state
    gameState.arena = createMatrix(COLS, ROWS);
    gameState.score = 0;
    gameState.lines = 0;
    gameState.level = 1;
    gameState.dropCounter = 0;
    gameState.isGameOver = false;
    gameState.isPaused = false;
    gameState.isRunning = true;
    gameState.holdPiece = null;
    gameState.canHold = true;
    gameState.piecesCounter = 0;
    gameState.bag = [];
    
    // Get settings from popup
    gameState.holdEnabled = document.getElementById('hold-toggle').checked;
    gameState.speedLevel = parseInt(document.getElementById('speed-slider').value);
    gameState.sprintLines = parseInt(document.getElementById('sprint-lines').value) || 5;
    gameState.sprintPieces = parseInt(document.getElementById('sprint-pieces').value) || 40;
    gameState.piecesCounter = 0;
    
    // Sprint settings
    if (gameState.mode === 'Sprint') {
        document.getElementById('mode-label').textContent = 'SPRINT';
        document.getElementById('game-container').classList.add('sprint-active');
    } else {
        document.getElementById('mode-label').textContent = 'MARATHON';
        document.getElementById('game-container').classList.remove('sprint-active');
    }
    
    // Show/hide hold
    const holdContainer = document.getElementById('hold-container');
    if (gameState.holdEnabled) {
        holdContainer.classList.remove('hidden');
    } else {
        holdContainer.classList.add('hidden');
    }
    
    updateDropInterval();
    updateScore();
    
    // Generate first pieces
    gameState.nextPiece = getNextPiece();
    playerReset();
    
    // Clear previews
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    
    hideOverlays();
    update(gameState.lastTime);
}

// ==========================================
// SETTINGS FUNCTIONS
// ==========================================

function toggleSettings() {
    const popup = document.getElementById('settings-popup');
    const opening = popup.classList.contains('hidden');
    popup.classList.toggle('hidden');
    
    if (opening && gameState.isRunning && !gameState.isGameOver) {
        gameState.wasPausedBeforeSettings = gameState.isPaused;
        gameState.isPaused = true;
    } else if (!opening) {
        gameState.isPaused = gameState.wasPausedBeforeSettings;
    }
    
    // Update speed display
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    speedValue.textContent = speedSlider.value;
    
    // Update mode buttons
    updateModeButtons();
}

function setMode(mode) {
    gameState.mode = mode;
    updateModeButtons();
    
    const sprintSettings = document.getElementById('sprint-settings');
    if (mode === 'Sprint') {
        sprintSettings.classList.remove('hidden');
    } else {
        sprintSettings.classList.add('hidden');
    }
}

function updateModeButtons() {
    const marathonBtn = document.getElementById('mode-marathon');
    const sprintBtn = document.getElementById('mode-sprint');
    
    if (gameState.mode === 'Marathon') {
        marathonBtn.classList.add('active');
        sprintBtn.classList.remove('active');
    } else {
        marathonBtn.classList.remove('active');
        sprintBtn.classList.add('active');
    }
}

function applySettings() {
    // Get settings values
    gameState.holdEnabled = document.getElementById('hold-toggle').checked;
    gameState.speedLevel = parseInt(document.getElementById('speed-slider').value);
    gameState.sprintLines = parseInt(document.getElementById('sprint-lines').value) || 5;
    gameState.sprintPieces = parseInt(document.getElementById('sprint-pieces').value) || 40;
    gameState.piecesCounter = 0;
    
    // Update UI
    if (gameState.mode === 'Sprint') {
        document.getElementById('mode-label').textContent = 'SPRINT';
        document.getElementById('game-container').classList.add('sprint-active');
    } else {
        document.getElementById('mode-label').textContent = 'MARATHON';
        document.getElementById('game-container').classList.remove('sprint-active');
    }
    
    // Show/hide hold
    const holdContainer = document.getElementById('hold-container');
    if (gameState.holdEnabled) {
        holdContainer.classList.remove('hidden');
    } else {
        holdContainer.classList.add('hidden');
    }
    
    // Close popup and start/restart game
    toggleSettings();
    startGame();
}

// ==========================================
// EVENT LISTENERS
// ==========================================

// Start button
document.getElementById('start-btn').addEventListener('click', startGame);

// Restart button
document.getElementById('restart-btn').addEventListener('click', startGame);

// Touch/Click Controls
document.getElementById('btn-left').addEventListener('click', () => {
    if (gameState.isRunning && !gameState.isGameOver && gameState.lineClearTimer <= 0) {
        playerMove(-1);
    }
});

document.getElementById('btn-right').addEventListener('click', () => {
    if (gameState.isRunning && !gameState.isGameOver && gameState.lineClearTimer <= 0) {
        playerMove(1);
    }
});

document.getElementById('btn-rotate').addEventListener('click', () => {
    if (gameState.isRunning && !gameState.isGameOver && gameState.lineClearTimer <= 0) {
        playerRotate(1);
    }
});

document.getElementById('btn-hard-drop').addEventListener('click', () => {
    if (gameState.isRunning && !gameState.isGameOver && gameState.lineClearTimer <= 0) {
        playerHardDrop();
        updateScore();
    }
});

document.getElementById('btn-hold').addEventListener('click', () => {
    if (gameState.isRunning && !gameState.isGameOver && gameState.lineClearTimer <= 0) {
        playerHold();
    }
});

document.getElementById('btn-pause').addEventListener('click', () => {
    togglePause();
});

document.getElementById('resume-btn').addEventListener('click', () => {
    if (gameState.isPaused && !gameState.isGameOver) {
        togglePause();
    }
});

// Canvas click for rotation (PC)
canvas.addEventListener('click', () => {
    if (gameState.isRunning && !gameState.isGameOver && gameState.lineClearTimer <= 0) {
        playerRotate(1);
    }
});

// Keyboard Controls
document.addEventListener('keydown', (event) => {
    if (!gameState.isRunning || gameState.isGameOver || gameState.lineClearTimer > 0) return;

    switch (event.keyCode) {
        case 37: // Left arrow
        case 65: // A key
            playerMove(-1);
            break;
        case 39: // Right arrow
        case 68: // D key
            playerMove(1);
            break;
        case 40: // Down arrow
        case 83: // S key
            playerDrop();
            gameState.score += 1;
            updateScore();
            break;
        case 38: // Up arrow (rotate)
        case 87: // W key (rotate)
        case 32: // Space (rotate)
        case 13: // Enter (rotate)
            playerRotate(1);
            break;
        case 17: // Ctrl (hard drop)
        case 16: // Shift (hard drop)
        case 27: // Escape (hard drop)
            event.preventDefault();
            playerHardDrop();
            updateScore();
            break;
        case 67: // C key (hold)
        case 16: // Shift key (hold)
            playerHold();
            break;
        case 80: // P key (pause)
            togglePause();
            break;
        case 27: // Escape (close settings)
            const popup = document.getElementById('settings-popup');
            if (!popup.classList.contains('hidden')) {
                toggleSettings();
            }
            break;
    }
});

// Settings Event Listeners
document.getElementById('speed-slider').addEventListener('input', (e) => {
    const speedValue = document.getElementById('speed-value');
    speedValue.textContent = e.target.value;
    
    if (gameState.isRunning) {
        gameState.speedLevel = parseInt(e.target.value);
        updateDropInterval();
    }
});

// Touch gesture support for the game canvas
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameState.isRunning || gameState.isGameOver || gameState.lineClearTimer > 0) return;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameState.isRunning || gameState.isGameOver || gameState.lineClearTimer > 0) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const deltaTime = Date.now() - touchStartTime;
    
    const SWIPE_THRESHOLD = 30;
    const TAP_THRESHOLD = 200; // ms
    
    // Check for tap (short touch, minimal movement)
    if (deltaTime < TAP_THRESHOLD && Math.abs(deltaX) < SWIPE_THRESHOLD && Math.abs(deltaY) < SWIPE_THRESHOLD) {
        playerRotate(1);
        return;
    }

    // Determine primary direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
            const moves = Math.floor(Math.abs(deltaX) / (BLOCK_SIZE * 0.8));
            const dir = deltaX > 0 ? 1 : -1;
            for (let i = 0; i < Math.min(moves, 5); i++) {
                playerMove(dir);
            }
        }
    } else {
        // Vertical swipe
        if (deltaY > SWIPE_THRESHOLD) {
            // Down swipe - check if it's a fast flick (hard drop) or slow (soft drop)
            const speed = deltaY / deltaTime;
            if (speed > 2 || deltaY > BLOCK_SIZE * 3) {
                playerHardDrop();
            } else {
                playerDrop();
                gameState.score += 1;
                updateScore();
            }
        } else if (deltaY < -SWIPE_THRESHOLD) {
            // Up swipe - rotate
            playerRotate(1);
        }
    }
}, { passive: false });

// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// ==========================================
// SERVICE WORKER (for PWA)
// ==========================================

// Create service worker file content
const swContent = `
const CACHE_NAME = 'tetris-mobile-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
`;

// Try to create service worker file
fetch('service-worker.js').catch(() => {
    // Service worker doesn't exist, we can't create it from JS
    // It should be created separately
});

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
    // Load best score
    gameState.best = parseInt(localStorage.getItem('tetrisBest')) || 0;
    document.getElementById('best').textContent = gameState.best;
    
    // Show start screen
    showStartScreen();
    
    // Draw initial empty board
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Start the app
init();