/**
 * Simple event bus for decoupling modules via pub/sub pattern
 * Allows modules to communicate without direct dependencies
 */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    this.events.get(eventName).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.events.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to an event that will only fire once
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  once(eventName, callback) {
    const unsubscribe = this.on(eventName, (...args) => {
      unsubscribe();
      callback(...args);
    });
    return unsubscribe;
  }

  /**
   * Emit an event with optional data
   * @param {string} eventName - Name of the event to emit
   * @param {*} data - Optional data to pass to callbacks
   */
  emit(eventName, data) {
    const callbacks = this.events.get(eventName);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for "${eventName}":`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if no name provided
   * @param {string} [eventName] - Optional event name to clear
   */
  off(eventName) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get count of listeners for an event
   * @param {string} eventName - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(eventName) {
    const callbacks = this.events.get(eventName);
    return callbacks ? callbacks.length : 0;
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Export class for testing
export { EventBus };

/**
 * Event names used throughout the application
 * Centralizing event names prevents typos and makes refactoring easier
 */
export const Events = {
  // Navigation events
  BOOK_CHANGED: 'book:changed',
  CHAPTER_CHANGED: 'chapter:changed',
  MODE_CHANGED: 'mode:changed',

  // Mode transition events
  ENTER_BOOKS_MODE: 'mode:enter:books',
  ENTER_CHAPTERS_MODE: 'mode:enter:chapters',
  ENTER_READING_MODE: 'mode:enter:reading',
  EXIT_CHAPTERS_MODE: 'mode:exit:chapters',
  EXIT_READING_MODE: 'mode:exit:reading',

  // Display events
  DISPLAY_UPDATE: 'display:update',
  DISPLAY_CHAPTER: 'display:chapter',
  DISPLAY_READING: 'display:reading',

  // Interaction events
  SLIDER_CHANGED: 'slider:changed',
  LETTER_SELECTED: 'letter:selected',
  BOOK_SELECTED: 'book:selected',

  // Error events
  ERROR: 'error',
  API_ERROR: 'api:error',
};
