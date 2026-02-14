// 2048 Game Core Logic
class Game {
  constructor(size = 4) {
    this.size = size;
    this.grid = [];
    this.score = 0;
    this.bestScore = 0;
    this.history = [];
    this.maxHistory = 20;
    this.gameState = 'playing'; // 'playing' | 'won' | 'lost'
    this.wonBefore = false; // track if player already hit 2048 (allow continue)
    this.moveId = 0;
  }

  init() {
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    this.score = 0;
    this.history = [];
    this.gameState = 'playing';
    this.wonBefore = false;
    this.moveId = 0;
    this.addRandomTile();
    this.addRandomTile();
    return this;
  }

  // Deep clone the grid
  cloneGrid(grid) {
    return grid.map(row => [...row]);
  }

  // Save current state to history (call before a move)
  pushHistory() {
    this.history.push({
      grid: this.cloneGrid(this.grid),
      score: this.score,
      gameState: this.gameState,
      wonBefore: this.wonBefore,
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  // Undo the last move
  undo() {
    if (this.history.length === 0) return false;
    const prev = this.history.pop();
    this.grid = prev.grid;
    this.score = prev.score;
    this.gameState = prev.gameState;
    this.wonBefore = prev.wonBefore;
    return true;
  }

  // Add a random tile (2 at 90%, 4 at 10%) to an empty cell
  addRandomTile() {
    const empty = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return null;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    this.grid[cell.r][cell.c] = value;
    return { r: cell.r, c: cell.c, value };
  }

  // Slide and merge a single row to the left
  // Returns { row, merged, scoreGain, mergePositions }
  slideRow(row) {
    // Remove zeros
    let filtered = row.filter(v => v !== 0);
    const merged = [];
    const mergePositions = [];
    let scoreGain = 0;
    const result = [];

    for (let i = 0; i < filtered.length; i++) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const mergedVal = filtered[i] * 2;
        result.push(mergedVal);
        scoreGain += mergedVal;
        merged.push(mergedVal);
        mergePositions.push(result.length - 1);
        i++; // skip next
      } else {
        result.push(filtered[i]);
      }
    }

    // Pad with zeros
    while (result.length < row.length) {
      result.push(0);
    }

    return { row: result, merged, scoreGain, mergePositions };
  }

  // Rotate grid 90 degrees clockwise
  rotateGrid(grid) {
    const n = grid.length;
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        rotated[c][n - 1 - r] = grid[r][c];
      }
    }
    return rotated;
  }

  // Rotate grid 90 degrees counter-clockwise
  rotateGridCCW(grid) {
    const n = grid.length;
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        rotated[n - 1 - c][r] = grid[r][c];
      }
    }
    return rotated;
  }

  // Execute a move in the given direction
  // Returns { moved, mergedTiles, newTile, scoreGain } or null if invalid
  move(direction) {
    if (this.gameState === 'lost') return null;
    if (this.gameState === 'won' && !this.wonBefore) return null;

    this.pushHistory();

    // Normalize: rotate grid so we always slide left
    let workGrid = this.cloneGrid(this.grid);
    const rotations = { left: 0, up: 3, right: 2, down: 1 };
    const rot = rotations[direction];

    for (let i = 0; i < rot; i++) {
      workGrid = this.rotateGrid(workGrid);
    }

    let moved = false;
    let totalScoreGain = 0;
    const allMerged = [];
    // Track tile movements for animation
    const tileMovements = [];

    for (let r = 0; r < this.size; r++) {
      const originalRow = [...workGrid[r]];
      const { row, merged, scoreGain, mergePositions } = this.slideRow(workGrid[r]);

      if (row.some((v, i) => v !== workGrid[r][i])) {
        moved = true;
      }

      // Track where each tile moved from -> to for this row
      // Map original positions to new positions
      let srcPositions = [];
      for (let c = 0; c < this.size; c++) {
        if (originalRow[c] !== 0) {
          srcPositions.push({ col: c, value: originalRow[c] });
        }
      }

      let destIdx = 0;
      let srcIdx = 0;
      while (srcIdx < srcPositions.length && destIdx < this.size) {
        if (row[destIdx] === 0) {
          destIdx++;
          continue;
        }
        if (mergePositions.includes(destIdx) && srcIdx + 1 < srcPositions.length) {
          // Two tiles merged into this position
          tileMovements.push({
            fromR: r, fromC: srcPositions[srcIdx].col,
            toR: r, toC: destIdx,
            value: srcPositions[srcIdx].value, merged: true, mergedValue: row[destIdx]
          });
          tileMovements.push({
            fromR: r, fromC: srcPositions[srcIdx + 1].col,
            toR: r, toC: destIdx,
            value: srcPositions[srcIdx + 1].value, merged: true, mergedValue: row[destIdx]
          });
          srcIdx += 2;
        } else {
          tileMovements.push({
            fromR: r, fromC: srcPositions[srcIdx].col,
            toR: r, toC: destIdx,
            value: srcPositions[srcIdx].value, merged: false
          });
          srcIdx++;
        }
        destIdx++;
      }

      workGrid[r] = row;
      totalScoreGain += scoreGain;
      allMerged.push(...merged);
    }

    if (!moved) {
      this.history.pop(); // restore history since nothing happened
      return null;
    }

    // Un-rotate the movements and grid
    const unrot = (4 - rot) % 4;
    for (let i = 0; i < unrot; i++) {
      workGrid = this.rotateGrid(workGrid);
    }

    // Un-rotate tile movement coordinates
    const unrotateCoord = (r, c, times) => {
      let cr = r, cc = c;
      for (let i = 0; i < times; i++) {
        const tmp = cr;
        cr = cc;
        cc = this.size - 1 - tmp;
      }
      return { r: cr, c: cc };
    };

    const movements = tileMovements.map(m => {
      const from = unrotateCoord(m.fromR, m.fromC, unrot);
      const to = unrotateCoord(m.toR, m.toC, unrot);
      return {
        from, to,
        value: m.value,
        merged: m.merged,
        mergedValue: m.mergedValue
      };
    });

    this.grid = workGrid;
    this.score += totalScoreGain;
    this.moveId++;

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
    }

    // Add new random tile
    const newTile = this.addRandomTile();

    // Check win condition
    const hasWon = allMerged.includes(2048) || this.grid.some(row => row.includes(2048));
    if (hasWon && !this.wonBefore) {
      this.gameState = 'won';
    }

    // Check lose condition
    if (!this.canMove()) {
      this.gameState = 'lost';
    }

    return {
      moved: true,
      movements,
      mergedTiles: allMerged,
      newTile,
      scoreGain: totalScoreGain,
      gameState: this.gameState
    };
  }

  // Continue playing after winning
  continueGame() {
    if (this.gameState === 'won') {
      this.wonBefore = true;
      this.gameState = 'playing';
    }
  }

  // Check if any move is possible
  canMove() {
    // Check for empty cells
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) return true;
      }
    }
    // Check for adjacent equal cells
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const val = this.grid[r][c];
        if (c + 1 < this.size && this.grid[r][c + 1] === val) return true;
        if (r + 1 < this.size && this.grid[r + 1][c] === val) return true;
      }
    }
    return false;
  }

  // Get the highest tile on the board
  getMaxTile() {
    let max = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] > max) max = this.grid[r][c];
      }
    }
    return max;
  }

  // Serialize game state for storage
  serialize() {
    return {
      grid: this.cloneGrid(this.grid),
      score: this.score,
      bestScore: this.bestScore,
      history: this.history.map(h => ({
        grid: this.cloneGrid(h.grid),
        score: h.score,
        gameState: h.gameState,
        wonBefore: h.wonBefore,
      })),
      gameState: this.gameState,
      wonBefore: this.wonBefore,
      moveId: this.moveId,
    };
  }

  // Restore game state from storage
  deserialize(data) {
    if (!data || !data.grid) return false;
    this.grid = data.grid;
    this.score = data.score || 0;
    this.bestScore = data.bestScore || 0;
    this.history = data.history || [];
    this.gameState = data.gameState || 'playing';
    this.wonBefore = data.wonBefore || false;
    this.moveId = data.moveId || 0;
    return true;
  }
}
