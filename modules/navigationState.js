import { MODES } from './constants.js';
import { chapterCounts } from '/data.js';
import { eventBus, Events } from './eventBus.js';

/**
 * Centralized application state management
 * Uses immutable updates and emits events on state changes
 */

// Private state object - only accessible through getters/setters
const state = {
  // Navigation state
  currentMode: MODES.BOOKS,
  currentBookIndex: 0,
  currentChapter: 1,
  previousTestament: null,

  // Letter cycling state
  lastSelectedLetter: null,
  letterCycleIndex: 0,
};

/**
 * Get a deep copy of the entire state (for debugging/testing)
 * @returns {Object} Copy of current state
 */
export function getState() {
  return { ...state };
}

// Navigation state getters
export function getCurrentMode() {
  return state.currentMode;
}

export function getCurrentBookIndex() {
  return state.currentBookIndex;
}

export function getCurrentChapter() {
  return state.currentChapter;
}

export function getPreviousTestament() {
  return state.previousTestament;
}

// Letter cycling getters
export function getLastSelectedLetter() {
  return state.lastSelectedLetter;
}

export function getLetterCycleIndex() {
  return state.letterCycleIndex;
}

// Navigation state setters
export function setCurrentMode(mode) {
  const oldMode = state.currentMode;
  state.currentMode = mode;
  if (oldMode !== mode) {
    eventBus.emit(Events.MODE_CHANGED, { oldMode, newMode: mode });
  }
}

export function setCurrentBookIndex(index) {
  const oldIndex = state.currentBookIndex;
  state.currentBookIndex = index;
  if (oldIndex !== index) {
    eventBus.emit(Events.BOOK_CHANGED, { oldIndex, newIndex: index });
  }
}

export function setCurrentChapter(chapter) {
  const oldChapter = state.currentChapter;
  state.currentChapter = chapter;
  if (oldChapter !== chapter) {
    eventBus.emit(Events.CHAPTER_CHANGED, { oldChapter, newChapter: chapter });
  }
}

export function setPreviousTestament(testament) {
  state.previousTestament = testament;
}

// Letter cycling setters
export function setLastSelectedLetter(letter) {
  state.lastSelectedLetter = letter;
}

export function setLetterCycleIndex(index) {
  state.letterCycleIndex = index;
}

// Mode transition functions
export function enterChapterMode(allBooks, slider, updateChapterDisplayCallback, enterReadingModeCallback) {
  const currentItem = allBooks[state.currentBookIndex];
  const chapters = chapterCounts[currentItem.book];

  state.currentMode = MODES.CHAPTERS;
  state.currentChapter = 1;

  slider.min = 1;
  slider.max = chapters;
  slider.value = 1;

  updateChapterDisplayCallback();
}

export function exitChapterMode(slider, updateDisplayCallback) {
  state.currentMode = MODES.BOOKS;

  slider.min = 0;
  slider.max = 65;
  slider.value = state.currentBookIndex;

  updateDisplayCallback(state.currentBookIndex);
}

export function enterReadingMode(updateReadingDisplayCallback) {
  state.currentMode = MODES.READING;
  updateReadingDisplayCallback();
}

export function exitReadingMode(allBooks, updateChapterDisplayCallback, exitChapterModeCallback) {
  state.currentMode = MODES.CHAPTERS;
  updateChapterDisplayCallback();
}
