/**
 * Unified gesture handler for touch and mouse events
 * Eliminates code duplication between touch and mouse handlers
 */

import {
  SWIPE_THRESHOLD,
  DRAG_THRESHOLD,
  MOVEMENT_DETECTION_THRESHOLD,
  TAP_DELAY
} from './constants.js';

/**
 * @typedef {Object} GestureState
 * @property {number} startX - Starting X coordinate
 * @property {number} startY - Starting Y coordinate
 * @property {number} lastX - Last X coordinate
 * @property {number} accumulatedDistance - Total distance accumulated
 * @property {boolean} isDragging - Whether currently dragging
 * @property {boolean} hasActuallyDragged - Whether movement threshold exceeded
 * @property {number} lastTapTime - Timestamp of last tap/click
 * @property {number|null} tapTimeout - Timeout ID for single tap detection
 */

export class GestureHandler {
  constructor() {
    this.state = this.createInitialState();
    this.lastTouchTime = 0; // Track touch events to ignore synthetic mouse events
    this.handlers = {
      onSwipe: null,
      onDrag: null,
      onTap: null,
      onDoubleTap: null,
    };
  }

  /**
   * Create initial gesture state
   * @returns {GestureState}
   */
  createInitialState() {
    return {
      startX: 0,
      startY: 0,
      lastX: 0,
      accumulatedDistance: 0,
      isDragging: false,
      hasActuallyDragged: false,
      lastTapTime: 0,
      tapTimeout: null,
    };
  }

  /**
   * Reset gesture state
   */
  reset() {
    if (this.state.tapTimeout) {
      clearTimeout(this.state.tapTimeout);
    }
    this.state = this.createInitialState();
  }

  /**
   * Register gesture handlers
   * @param {Object} handlers - Object containing callback functions
   */
  setHandlers(handlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Extract coordinates from touch or mouse event
   * @param {TouchEvent|MouseEvent} event - Event object
   * @returns {{x: number, y: number, clientX: number}}
   */
  getEventCoordinates(event) {
    if (event.type.startsWith('touch')) {
      return {
        x: event.changedTouches[0].screenX,
        y: event.changedTouches[0].screenY,
        clientX: event.changedTouches[0].clientX,
      };
    } else {
      return {
        x: event.screenX,
        y: event.screenY,
        clientX: event.clientX,
      };
    }
  }

  /**
   * Handle start of gesture (mousedown/touchstart)
   * @param {TouchEvent|MouseEvent} event - Event object
   */
  handleStart(event) {
    const coords = this.getEventCoordinates(event);

    this.state.startX = coords.x;
    this.state.startY = coords.y;
    this.state.lastX = coords.x;
    this.state.accumulatedDistance = 0;
    this.state.isDragging = true;
    this.state.hasActuallyDragged = false;
  }

  /**
   * Handle move during gesture (mousemove/touchmove)
   * @param {TouchEvent|MouseEvent} event - Event object
   * @returns {Object|null} Swipe data if threshold exceeded, null otherwise
   */
  handleMove(event) {
    if (!this.state.isDragging) return null;

    const coords = this.getEventCoordinates(event);
    const deltaX = coords.x - this.state.startX;
    const deltaY = coords.y - this.state.startY;

    // Check if movement threshold exceeded
    if (Math.abs(deltaX) > MOVEMENT_DETECTION_THRESHOLD ||
        Math.abs(deltaY) > MOVEMENT_DETECTION_THRESHOLD) {
      this.state.hasActuallyDragged = true;
    }

    // Check for horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const movement = coords.x - this.state.lastX;
      this.state.accumulatedDistance += movement;

      if (Math.abs(this.state.accumulatedDistance) >= SWIPE_THRESHOLD) {
        const direction = this.state.accumulatedDistance > 0 ? -1 : 1;
        this.state.accumulatedDistance = 0;
        this.state.lastX = coords.x;

        if (this.handlers.onSwipe) {
          return this.handlers.onSwipe(direction);
        }
      }

      this.state.lastX = coords.x;
      return { preventDefault: true };
    }

    return null;
  }

  /**
   * Handle end of gesture (mouseup/touchend)
   * @param {TouchEvent|MouseEvent} event - Event object
   * @returns {string|null} Gesture type detected ('tap', 'double-tap', 'drag', or null)
   */
  handleEnd(event) {
    if (!this.state.isDragging) return null;

    const coords = this.getEventCoordinates(event);
    const currentTime = new Date().getTime();
    const timeSinceLastTap = currentTime - this.state.lastTapTime;

    // Handle drag in certain modes
    if (this.state.hasActuallyDragged) {
      const dragDistance = coords.x - this.state.startX;

      if (Math.abs(dragDistance) > DRAG_THRESHOLD && this.handlers.onDrag) {
        const direction = dragDistance > 0 ? -1 : 1;
        this.handlers.onDrag(direction);
      }

      this.reset();
      this.state.lastTapTime = currentTime;
      return 'drag';
    }

    // Check for double-tap
    if (timeSinceLastTap < TAP_DELAY && timeSinceLastTap > 0) {
      if (this.state.tapTimeout) {
        clearTimeout(this.state.tapTimeout);
        this.state.tapTimeout = null;
      }

      if (this.handlers.onDoubleTap) {
        this.handlers.onDoubleTap();
      }

      this.reset();
      this.state.lastTapTime = currentTime;
      return 'double-tap';
    }

    // Single tap (with delay to detect double-tap)
    if (this.state.tapTimeout) {
      clearTimeout(this.state.tapTimeout);
    }

    this.state.tapTimeout = setTimeout(() => {
      if (this.handlers.onTap) {
        this.handlers.onTap(coords.clientX);
      }
      this.state.tapTimeout = null;
    }, TAP_DELAY);

    this.state.lastTapTime = currentTime;
    this.state.isDragging = false;
    this.state.accumulatedDistance = 0;

    return 'tap';
  }

  /**
   * Check if currently dragging
   * @returns {boolean}
   */
  isDragging() {
    return this.state.isDragging;
  }

  /**
   * Check if has actually moved (not just a tap)
   * @returns {boolean}
   */
  hasMovement() {
    return this.state.hasActuallyDragged;
  }
}

/**
 * Create gesture handler for an element
 * @param {HTMLElement} element - Element to attach handlers to
 * @param {Object} callbacks - Gesture callback functions
 * @param {Function} [shouldIgnoreEvent] - Optional function to determine if event should be ignored
 * @returns {GestureHandler} Gesture handler instance
 */
export function createGestureHandler(element, callbacks, shouldIgnoreEvent = null) {
  const handler = new GestureHandler();
  handler.setHandlers(callbacks);

  // Touch events (non-passive because we need to call preventDefault)
  element.addEventListener('touchstart', (e) => {
    if (shouldIgnoreEvent && shouldIgnoreEvent(e)) return;
    handler.handleStart(e);
  }, { passive: false });

  element.addEventListener('touchmove', (e) => {
    if (shouldIgnoreEvent && shouldIgnoreEvent(e)) return;
    const result = handler.handleMove(e);
    if (result && result.preventDefault) {
      e.preventDefault();
    }
  }, { passive: false });

  element.addEventListener('touchend', (e) => {
    if (shouldIgnoreEvent && shouldIgnoreEvent(e)) return;
    handler.handleEnd(e);
    handler.lastTouchTime = Date.now(); // Track touch time to ignore synthetic mouse events
  });

  // Mouse events
  element.addEventListener('mousedown', (e) => {
    if (shouldIgnoreEvent && shouldIgnoreEvent(e)) return;
    // Ignore synthetic mouse events that fire after touch events
    if (Date.now() - handler.lastTouchTime < 500) return;
    e.preventDefault();
    handler.handleStart(e);
  });

  element.addEventListener('mousemove', (e) => {
    if (shouldIgnoreEvent && shouldIgnoreEvent(e)) return;
    handler.handleMove(e);
  });

  element.addEventListener('mouseup', (e) => {
    if (shouldIgnoreEvent && shouldIgnoreEvent(e)) return;
    // Ignore synthetic mouse events that fire after touch events
    if (Date.now() - handler.lastTouchTime < 500) return;
    handler.handleEnd(e);
  });

  // Double-click for desktop
  element.addEventListener('dblclick', (e) => {
    if (shouldIgnoreEvent && shouldIgnoreEvent(e)) return;
    // Ignore synthetic dblclick events that fire after touch events
    if (Date.now() - handler.lastTouchTime < 500) return;
    e.preventDefault();
    if (callbacks.onDoubleTap) {
      callbacks.onDoubleTap();
    }
  });

  return handler;
}
