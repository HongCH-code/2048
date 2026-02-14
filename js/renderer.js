// Renderer - DOM rendering and animations
class Renderer {
  constructor(boardEl, tileContainerEl, gridBackgroundEl) {
    this.boardEl = boardEl;
    this.tileContainerEl = tileContainerEl;
    this.gridBackgroundEl = gridBackgroundEl;
    this.tileElements = new Map(); // key: "r-c", value: DOM element
    this.tileIdCounter = 0;
    this.size = 4;
    this.animating = false;

    this._buildGrid();
    this._calculateSizes();
    window.addEventListener('resize', () => this._calculateSizes());
  }

  _buildGrid() {
    this.gridBackgroundEl.innerHTML = '';
    for (let i = 0; i < this.size * this.size; i++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      this.gridBackgroundEl.appendChild(cell);
    }
  }

  _calculateSizes() {
    const boardRect = this.boardEl.getBoundingClientRect();
    const boardSize = boardRect.width;
    const padding = Math.max(8, boardSize * 0.02);
    const gap = padding;
    const cellSize = (boardSize - padding * 2 - gap * 3) / 4;

    this.boardPadding = padding;
    this.cellGap = gap;
    this.cellSize = cellSize;

    // Update CSS variables
    this.boardEl.style.setProperty('--board-padding', padding + 'px');
    this.boardEl.style.setProperty('--cell-gap', gap + 'px');
    this.boardEl.style.setProperty('--tile-size', cellSize + 'px');
  }

  _getCellPosition(r, c) {
    const x = this.boardPadding + c * (this.cellSize + this.cellGap);
    const y = this.boardPadding + r * (this.cellSize + this.cellGap);
    // Positions are relative to tile-container which is offset by boardPadding
    return {
      x: c * (this.cellSize + this.cellGap),
      y: r * (this.cellSize + this.cellGap),
    };
  }

  _getTileClass(value) {
    if (value <= 2048) return `tile-${value}`;
    return 'tile-super';
  }

  _getFontSizeClass(value) {
    if (value < 100) return 'tile-large';
    if (value < 1000) return 'tile-medium';
    if (value < 10000) return 'tile-small';
    return 'tile-xsmall';
  }

  _createTileElement(r, c, value) {
    const el = document.createElement('div');
    const pos = this._getCellPosition(r, c);
    el.className = `tile ${this._getTileClass(value)} ${this._getFontSizeClass(value)}`;
    el.textContent = value;
    el.style.width = this.cellSize + 'px';
    el.style.height = this.cellSize + 'px';
    el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    el.setAttribute('role', 'gridcell');
    el.setAttribute('aria-label', `Tile ${value}`);
    return el;
  }

  // Render the full grid state (no animation, used for initial load / undo)
  renderGrid(grid) {
    this.tileContainerEl.innerHTML = '';
    this.tileElements.clear();
    this._calculateSizes();

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (grid[r][c] !== 0) {
          const el = this._createTileElement(r, c, grid[r][c]);
          this.tileContainerEl.appendChild(el);
          this.tileElements.set(`${r}-${c}`, el);
        }
      }
    }
  }

  // Animate a move result from game.move()
  animateMove(moveResult, grid) {
    return new Promise(resolve => {
      this.animating = true;
      this._calculateSizes();

      const { movements, newTile } = moveResult;

      // Phase 1: Slide existing tiles
      // Clear container and create tiles at their OLD positions
      this.tileContainerEl.innerHTML = '';
      this.tileElements.clear();

      const movingTiles = [];
      const mergeTargets = new Set(); // positions that will have merges

      movements.forEach(m => {
        if (m.merged) {
          mergeTargets.add(`${m.to.r}-${m.to.c}`);
        }
      });

      // Create tile elements at their source positions
      movements.forEach(m => {
        const el = this._createTileElement(m.from.r, m.from.c, m.value);
        this.tileContainerEl.appendChild(el);
        movingTiles.push({ el, to: m.to, merged: m.merged, mergedValue: m.mergedValue });
      });

      // Force reflow before animating
      void this.tileContainerEl.offsetHeight;

      // Move tiles to their destination
      movingTiles.forEach(({ el, to }) => {
        const pos = this._getCellPosition(to.r, to.c);
        el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      });

      // Phase 2: After slide animation, handle merges and new tile
      const slideTime = 100; // match CSS transition
      setTimeout(() => {
        // Rebuild the tile container with final grid state
        this.tileContainerEl.innerHTML = '';
        this.tileElements.clear();

        for (let r = 0; r < this.size; r++) {
          for (let c = 0; c < this.size; c++) {
            if (grid[r][c] !== 0) {
              const isNew = newTile && newTile.r === r && newTile.c === c;
              const isMerged = mergeTargets.has(`${r}-${c}`);

              const el = this._createTileElement(r, c, grid[r][c]);

              if (isNew) {
                el.classList.add('tile-new');
              } else if (isMerged) {
                el.classList.add('tile-merged');
              }

              this.tileContainerEl.appendChild(el);
              this.tileElements.set(`${r}-${c}`, el);
            }
          }
        }

        // Animation fully complete
        setTimeout(() => {
          this.animating = false;
          resolve();
        }, 200); // wait for pop/appear animation
      }, slideTime);
    });
  }

  // Show score addition animation
  showScoreAddition(value) {
    const el = document.getElementById('score-addition');
    if (!el || value <= 0) return;
    el.textContent = '+' + value;
    el.classList.remove('active');
    void el.offsetHeight; // force reflow
    el.classList.add('active');
  }

  // Update score displays
  updateScores(score, bestScore) {
    document.getElementById('current-score').textContent = score;
    document.getElementById('best-score').textContent = bestScore;
  }

  // Show/hide game overlay
  showOverlay(message, showContinue = false) {
    const overlay = document.getElementById('game-overlay');
    const msgEl = document.getElementById('overlay-message');
    const continueBtn = document.getElementById('overlay-continue-btn');

    msgEl.textContent = message;
    continueBtn.style.display = showContinue ? 'block' : 'none';

    // Delay to allow any animations to start
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
  }

  hideOverlay() {
    document.getElementById('game-overlay').classList.remove('active');
  }

  // Update stats display
  updateStats(stats) {
    document.getElementById('stat-games').textContent = stats.gamesPlayed;
    document.getElementById('stat-wins').textContent = stats.gamesWon;
    document.getElementById('stat-best-tile').textContent = stats.bestTile;

    const minutes = Math.floor(stats.totalPlayTime / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      document.getElementById('stat-time').textContent = `${hours}h ${minutes % 60}m`;
    } else {
      document.getElementById('stat-time').textContent = `${minutes}m`;
    }
  }
}
