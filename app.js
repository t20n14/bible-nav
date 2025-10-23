/**
 * Main application entry point
 * Initializes the Bible navigation app with simplified, decoupled architecture
 */

import { buildAllBooks } from './modules/bookDataUtils.js';
import {
  initDisplayManager,
  updateDisplay,
  updateChapterDisplay,
  updateReadingDisplay
} from './modules/displayManager.js';
import {
  enterChapterMode,
  exitChapterMode,
  enterReadingMode,
  exitReadingMode
} from './modules/navigationState.js';
import { initEventHandlers } from './modules/eventHandlers.js';

// DOM element references - query once at initialization
const dom = {
  slider: document.getElementById("slider"),
  letterDisplay: document.getElementById("letterDisplay"),
  container: document.getElementById("container"),
  swipeHint: document.getElementById("swipeHint"),
  bookCountDisplay: document.getElementById("bookCountDisplay"),
  alphabetNav: document.getElementById("alphabetNav"),
};

// Build data structures
const allBooks = buildAllBooks();

// Initialize display manager with DOM references (removes side effects)
initDisplayManager({
  container: dom.container,
  letterDisplay: dom.letterDisplay,
  bookCountDisplay: dom.bookCountDisplay,
  swipeHint: dom.swipeHint,
  alphabetNav: dom.alphabetNav,
});

// Create simplified callback wrappers that capture allBooks in closure
const updateDisplayWrapper = (index, filterLetter = null) => {
  updateDisplay(allBooks, index, filterLetter);
};

const updateChapterDisplayWrapper = () => {
  updateChapterDisplay(allBooks);
};

const updateReadingDisplayWrapper = () => {
  updateReadingDisplay(allBooks);
};

const enterChapterModeWrapper = () => {
  enterChapterMode(allBooks, dom.slider, updateChapterDisplayWrapper, enterReadingModeWrapper);
};

const exitChapterModeWrapper = () => {
  exitChapterMode(dom.slider, updateDisplayWrapper);
};

const enterReadingModeWrapper = () => {
  enterReadingMode(updateReadingDisplayWrapper);
};

const exitReadingModeWrapper = () => {
  exitReadingMode(allBooks, updateChapterDisplayWrapper, exitChapterModeWrapper);
};

// Initialize event handlers with new object-based API
initEventHandlers({
  container: dom.container,
  slider: dom.slider,
  letterDisplay: dom.letterDisplay,
  alphabetNav: dom.alphabetNav,
  allBooks,
  updateDisplayCallback: updateDisplayWrapper,
  updateChapterDisplayCallback: updateChapterDisplayWrapper,
  updateReadingDisplayCallback: updateReadingDisplayWrapper,
  enterChapterModeCallback: enterChapterModeWrapper,
  exitChapterModeCallback: exitChapterModeWrapper,
  enterReadingModeCallback: enterReadingModeWrapper,
  exitReadingModeCallback: exitReadingModeWrapper,
});

// Initial display
updateDisplayWrapper(0);
