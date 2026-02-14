// Input Handler - Keyboard and Touch
class InputHandler {
  constructor(onMove) {
    this.onMove = onMove;
    this.locked = false;
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;
    this.minSwipeDistance = 30;

    this._bindKeyboard();
    this._bindTouch();
  }

  lock() {
    this.locked = true;
  }

  unlock() {
    this.locked = false;
  }

  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (this.locked) return;

      let direction = null;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          direction = 'up'; break;
        case 'ArrowDown': case 's': case 'S':
          direction = 'down'; break;
        case 'ArrowLeft': case 'a': case 'A':
          direction = 'left'; break;
        case 'ArrowRight': case 'd': case 'D':
          direction = 'right'; break;
      }

      if (direction) {
        e.preventDefault();
        this.onMove(direction);
      }
    });
  }

  _bindTouch() {
    const board = document.getElementById('game-board');
    if (!board) return;

    board.addEventListener('touchstart', (e) => {
      if (this.locked) return;
      if (e.touches.length !== 1) return;
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
      this._touchStartTime = Date.now();
    }, { passive: true });

    board.addEventListener('touchend', (e) => {
      if (this.locked) return;
      if (e.changedTouches.length !== 1) return;

      const dx = e.changedTouches[0].clientX - this._touchStartX;
      const dy = e.changedTouches[0].clientY - this._touchStartY;
      const elapsed = Date.now() - this._touchStartTime;

      // Ignore very slow swipes (> 1 second)
      if (elapsed > 1000) return;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < this.minSwipeDistance) return;

      let direction;
      if (absDx > absDy) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }

      this.onMove(direction);
    }, { passive: true });

    // Prevent scrolling on the game board
    board.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });
  }

  destroy() {
    // In a real SPA we'd remove listeners; for this single-page game it's fine
  }
}
