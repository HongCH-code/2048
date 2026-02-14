// Storage Manager - localStorage persistence
class Storage {
  constructor() {
    this.prefix = 'game2048_';
  }

  _key(name) {
    return this.prefix + name;
  }

  _get(name) {
    try {
      const data = localStorage.getItem(this._key(name));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  _set(name, value) {
    try {
      localStorage.setItem(this._key(name), JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }

  // Game state
  getGameState() {
    return this._get('state');
  }

  setGameState(state) {
    this._set('state', state);
  }

  clearGameState() {
    try {
      localStorage.removeItem(this._key('state'));
    } catch {}
  }

  // Best score
  getBestScore() {
    return this._get('bestScore') || 0;
  }

  setBestScore(score) {
    this._set('bestScore', score);
  }

  // Settings
  getSettings() {
    return this._get('settings') || {
      theme: 'auto',
      sound: true,
    };
  }

  setSettings(settings) {
    this._set('settings', settings);
  }

  // Statistics
  getStats() {
    return this._get('stats') || {
      gamesPlayed: 0,
      gamesWon: 0,
      bestTile: 0,
      totalPlayTime: 0, // in seconds
    };
  }

  setStats(stats) {
    this._set('stats', stats);
  }

  updateStats(updates) {
    const stats = this.getStats();
    Object.assign(stats, updates);
    this.setStats(stats);
  }
}
