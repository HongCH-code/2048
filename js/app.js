// App - Main entry point, wires everything together
class App {
  constructor() {
    this.game = new Game();
    this.storage = new Storage();
    this.sound = new SoundManager();
    this.renderer = new Renderer(
      document.getElementById('game-board'),
      document.getElementById('tile-container'),
      document.getElementById('grid-background')
    );
    this.input = new InputHandler((dir) => this.handleMove(dir));
    this.playTimer = null;
    this.sessionStart = Date.now();

    this._loadSettings();
    this._loadGame();
    this._bindUI();
    this._startPlayTimer();
  }

  _loadSettings() {
    const settings = this.storage.getSettings();

    // Theme
    if (settings.theme === 'dark') {
      this._applyTheme('dark');
    } else if (settings.theme === 'light') {
      this._applyTheme('light');
    } else {
      // Auto: follow system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._applyTheme(prefersDark ? 'dark' : 'light');
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const s = this.storage.getSettings();
        if (s.theme === 'auto') {
          this._applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }

    // Sound
    this.sound.setEnabled(settings.sound);
    this._updateSoundIcon(settings.sound);
  }

  _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this._updateThemeIcon(theme);
    // Update meta theme-color
    const color = theme === 'dark' ? '#1a1a2e' : '#faf8ef';
    document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')?.setAttribute('content', color);
    document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')?.setAttribute('content', color);
  }

  _updateThemeIcon(theme) {
    const sun = document.getElementById('icon-sun');
    const moon = document.getElementById('icon-moon');
    if (sun && moon) {
      sun.style.display = theme === 'dark' ? 'none' : 'block';
      moon.style.display = theme === 'dark' ? 'block' : 'none';
    }
  }

  _updateSoundIcon(enabled) {
    const on = document.getElementById('icon-sound-on');
    const off = document.getElementById('icon-sound-off');
    if (on && off) {
      on.style.display = enabled ? 'block' : 'none';
      off.style.display = enabled ? 'none' : 'block';
    }
  }

  _loadGame() {
    const saved = this.storage.getGameState();
    const bestScore = this.storage.getBestScore();
    this.game.bestScore = bestScore;

    if (saved && this.game.deserialize(saved)) {
      this.game.bestScore = Math.max(bestScore, this.game.bestScore);
    } else {
      this.game.init();
    }

    this.renderer.renderGrid(this.game.grid);
    this.renderer.updateScores(this.game.score, this.game.bestScore);
    this.renderer.hideOverlay();

    // Show overlay if game was already over
    if (this.game.gameState === 'won') {
      this.renderer.showOverlay('You Win!', true);
    } else if (this.game.gameState === 'lost') {
      this.renderer.showOverlay('Game Over!', false);
    }
  }

  _saveGame() {
    this.storage.setGameState(this.game.serialize());
    this.storage.setBestScore(this.game.bestScore);
  }

  _bindUI() {
    // New game
    document.getElementById('btn-new').addEventListener('click', () => {
      this.sound.playClick();
      this.newGame();
    });

    // Undo
    document.getElementById('btn-undo').addEventListener('click', () => {
      this.sound.playClick();
      this.undo();
    });

    // Sound toggle
    document.getElementById('btn-sound').addEventListener('click', () => {
      const enabled = this.sound.toggle();
      this._updateSoundIcon(enabled);
      this.sound.playClick();
      const settings = this.storage.getSettings();
      settings.sound = enabled;
      this.storage.setSettings(settings);
    });

    // Theme toggle
    document.getElementById('btn-theme').addEventListener('click', () => {
      this.sound.playClick();
      const current = document.documentElement.getAttribute('data-theme');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      this._applyTheme(newTheme);
      const settings = this.storage.getSettings();
      settings.theme = newTheme;
      this.storage.setSettings(settings);
    });

    // Stats
    document.getElementById('btn-stats').addEventListener('click', () => {
      this.sound.playClick();
      this._showStats();
    });

    document.getElementById('stats-close').addEventListener('click', () => {
      document.getElementById('stats-modal').style.display = 'none';
    });

    document.getElementById('stats-modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('stats-modal')) {
        document.getElementById('stats-modal').style.display = 'none';
      }
    });

    // Overlay buttons
    document.getElementById('overlay-btn').addEventListener('click', () => {
      this.sound.playClick();
      this.newGame();
    });

    document.getElementById('overlay-continue-btn').addEventListener('click', () => {
      this.sound.playClick();
      this.game.continueGame();
      this.renderer.hideOverlay();
      this._saveGame();
    });

    // Keyboard shortcut for undo (Ctrl+Z / Cmd+Z)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.undo();
      }
    });

    // Haptic feedback on touch
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('touchstart', () => {
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }, { passive: true });
    });
  }

  async handleMove(direction) {
    if (this.renderer.animating) return;
    if (this.game.gameState === 'lost') return;
    if (this.game.gameState === 'won' && !this.game.wonBefore) return;

    // Resume audio context on first interaction
    this.sound.resume();

    const result = this.game.move(direction);
    if (!result) return;

    // Lock input during animation
    this.input.lock();

    // Play move sound
    this.sound.playMove();

    // Play merge sounds
    if (result.mergedTiles.length > 0) {
      const maxMerge = Math.max(...result.mergedTiles);
      setTimeout(() => this.sound.playMerge(maxMerge), 50);
    }

    // Haptic feedback for merge
    if (result.mergedTiles.length > 0 && navigator.vibrate) {
      navigator.vibrate(15);
    }

    // Animate
    await this.renderer.animateMove(result, this.game.grid);

    // Update scores
    this.renderer.updateScores(this.game.score, this.game.bestScore);
    if (result.scoreGain > 0) {
      this.renderer.showScoreAddition(result.scoreGain);
    }

    // Check game state
    if (result.gameState === 'won') {
      this.sound.playWin();
      this.renderer.showOverlay('You Win!', true);
      this._recordWin();
    } else if (result.gameState === 'lost') {
      this.sound.playLose();
      this.renderer.showOverlay('Game Over!', false);
      this._recordGameOver();
    }

    this._saveGame();
    this.input.unlock();
  }

  newGame() {
    // Record current game as played if it was in progress
    if (this.game.moveId > 0) {
      const stats = this.storage.getStats();
      stats.gamesPlayed++;
      const maxTile = this.game.getMaxTile();
      if (maxTile > stats.bestTile) stats.bestTile = maxTile;
      this.storage.setStats(stats);
    }

    this.game.init();
    this.game.bestScore = this.storage.getBestScore();
    this.renderer.hideOverlay();
    this.renderer.renderGrid(this.game.grid);
    this.renderer.updateScores(this.game.score, this.game.bestScore);
    this._saveGame();
  }

  undo() {
    if (this.renderer.animating) return;
    if (this.game.undo()) {
      this.renderer.hideOverlay();
      this.renderer.renderGrid(this.game.grid);
      this.renderer.updateScores(this.game.score, this.game.bestScore);
      this._saveGame();
    }
  }

  _recordWin() {
    const stats = this.storage.getStats();
    stats.gamesWon++;
    const maxTile = this.game.getMaxTile();
    if (maxTile > stats.bestTile) stats.bestTile = maxTile;
    this.storage.setStats(stats);
  }

  _recordGameOver() {
    const stats = this.storage.getStats();
    stats.gamesPlayed++;
    const maxTile = this.game.getMaxTile();
    if (maxTile > stats.bestTile) stats.bestTile = maxTile;
    this.storage.setStats(stats);
  }

  _showStats() {
    const stats = this.storage.getStats();
    this.renderer.updateStats(stats);
    document.getElementById('stats-modal').style.display = 'flex';
  }

  _startPlayTimer() {
    this.playTimer = setInterval(() => {
      if (this.game.gameState === 'playing') {
        const stats = this.storage.getStats();
        stats.totalPlayTime++;
        this.storage.setStats(stats);
      }
    }, 1000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // SW registration failed, app still works
    });
  });
}
