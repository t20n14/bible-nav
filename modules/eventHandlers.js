/**
 * Refactored event handlers using gesture abstraction and event bus
 * Significantly reduces code duplication and improves maintainability
 */

import { chapterCounts } from '/data.js';
import { MODES } from './constants.js';
import {
  getCurrentMode,
  getCurrentBookIndex,
  setCurrentBookIndex,
  getCurrentChapter,
  setCurrentChapter,
  getLastSelectedLetter,
  setLastSelectedLetter,
  getLetterCycleIndex,
  setLetterCycleIndex
} from './navigationState.js';
import { sortBooksByName, getFirstAlphabeticChar } from './bookDataUtils.js';
import { createGestureHandler } from './gestureHandler.js';

/**
 * Initialize all event handlers for the application
 * @param {Object} params - Configuration object
 * @param {HTMLElement} params.container - Main container element
 * @param {HTMLInputElement} params.slider - Range slider element
 * @param {HTMLElement} params.letterDisplay - Display area for book/chapter info
 * @param {HTMLElement} params.alphabetNav - Alphabet navigation element
 * @param {Array} params.allBooks - Array of all book data
 * @param {Function} params.updateDisplayCallback - Callback to update book display
 * @param {Function} params.updateChapterDisplayCallback - Callback to update chapter display
 * @param {Function} params.updateReadingDisplayCallback - Callback to update reading display
 * @param {Function} params.enterChapterModeCallback - Callback to enter chapter mode
 * @param {Function} params.exitChapterModeCallback - Callback to exit chapter mode
 * @param {Function} params.enterReadingModeCallback - Callback to enter reading mode
 * @param {Function} params.exitReadingModeCallback - Callback to exit reading mode
 */
export function initEventHandlers({
  container,
  slider,
  letterDisplay,
  alphabetNav,
  allBooks,
  updateDisplayCallback,
  updateChapterDisplayCallback,
  updateReadingDisplayCallback,
  enterChapterModeCallback,
  exitChapterModeCallback,
  enterReadingModeCallback,
  exitReadingModeCallback
}) {
  // Slider event listener
  slider.addEventListener("input", function () {
    if (getCurrentMode() === MODES.BOOKS) {
      updateDisplayCallback(parseInt(this.value));
    } else {
      setCurrentChapter(parseInt(this.value));
      updateChapterDisplayCallback();
    }
  });

  // Create unified gesture handler for main container
  const gestureHandler = createGestureHandler(
    container,
    {
      onSwipe: (direction) => {
        handleSwipe(direction, allBooks, slider, updateDisplayCallback, updateChapterDisplayCallback);
      },
      onDrag: (direction) => {
        handleDrag(direction, allBooks, updateReadingDisplayCallback);
      },
      onTap: (clientX) => {
        handleTap(clientX, allBooks, enterChapterModeCallback, enterReadingModeCallback, updateReadingDisplayCallback);
      },
      onDoubleTap: () => {
        handleDoubleTap(exitChapterModeCallback, exitReadingModeCallback);
      }
    },
    (event) => {
      // Should ignore event if it's on the slider or certain UI elements
      return event.target === slider ||
             event.target.classList.contains("book-item") ||
             event.target.classList.contains("alphabet-letter");
    }
  );

  // Book button click handler (delegated)
  letterDisplay.addEventListener("click", function (e) {
    if (getCurrentMode() === MODES.BOOKS && e.target.classList.contains("book-item")) {
      const clickedBook = e.target.dataset.book;
      const bookIndex = allBooks.findIndex((item) => item.book === clickedBook);
      if (bookIndex !== -1) {
        setCurrentBookIndex(bookIndex);
        slider.value = bookIndex;
        updateDisplayCallback(bookIndex);
        enterChapterModeCallback();
      }
    }
  });

  // Alphabet navigation click handler (delegated)
  alphabetNav.addEventListener("click", function (e) {
    if (getCurrentMode() === MODES.BOOKS && e.target.classList.contains("alphabet-letter")) {
      handleAlphabetClick(e.target.dataset.letter, allBooks, slider, updateDisplayCallback);
    }
  });
}

/**
 * Handle swipe gesture
 */
function handleSwipe(direction, allBooks, slider, updateDisplayCallback, updateChapterDisplayCallback) {
  if (getCurrentMode() === MODES.BOOKS) {
    const newIndex = getCurrentBookIndex() + direction;
    if (newIndex >= 0 && newIndex < allBooks.length) {
      setCurrentBookIndex(newIndex);
      slider.value = newIndex;
      updateDisplayCallback(newIndex);
      return true;
    }
  } else if (getCurrentMode() === MODES.CHAPTERS) {
    const currentItem = allBooks[getCurrentBookIndex()];
    const chapters = chapterCounts[currentItem.book];
    const newChapter = getCurrentChapter() + direction;

    if (newChapter >= 1 && newChapter <= chapters) {
      setCurrentChapter(newChapter);
      slider.value = newChapter;
      updateChapterDisplayCallback();
      return true;
    }
  }
  return false;
}

/**
 * Handle drag gesture (used in reading mode)
 */
function handleDrag(direction, allBooks, updateReadingDisplayCallback) {
  if (getCurrentMode() !== MODES.READING) return false;

  const currentItem = allBooks[getCurrentBookIndex()];
  const chapters = chapterCounts[currentItem.book];

  if (chapters > 1) {
    const newChapter = getCurrentChapter() + direction;

    if (newChapter >= 1 && newChapter <= chapters) {
      setCurrentChapter(newChapter);
      updateReadingDisplayCallback();
      return true;
    }
  }
  return false;
}

/**
 * Handle single tap
 */
function handleTap(clientX, allBooks, enterChapterModeCallback, enterReadingModeCallback, updateReadingDisplayCallback) {
  if (getCurrentMode() === MODES.BOOKS) {
    enterChapterModeCallback();
  } else if (getCurrentMode() === MODES.CHAPTERS) {
    enterReadingModeCallback();
  } else if (getCurrentMode() === MODES.READING) {
    // Tap left/right to navigate chapters
    const currentItem = allBooks[getCurrentBookIndex()];
    const chapters = chapterCounts[currentItem.book];

    if (chapters > 1) {
      const screenWidth = window.innerWidth;
      const isLeftSide = clientX < screenWidth / 2;
      const direction = isLeftSide ? -1 : 1;
      const newChapter = getCurrentChapter() + direction;

      if (newChapter >= 1 && newChapter <= chapters) {
        setCurrentChapter(newChapter);
        updateReadingDisplayCallback();
      }
    }
  }
}

/**
 * Handle double tap
 */
function handleDoubleTap(exitChapterModeCallback, exitReadingModeCallback) {
  if (getCurrentMode() === MODES.CHAPTERS) {
    exitChapterModeCallback();
  } else if (getCurrentMode() === MODES.READING) {
    exitReadingModeCallback();
  }
}

/**
 * Handle alphabet letter click with cycling
 */
function handleAlphabetClick(letter, allBooks, slider, updateDisplayCallback) {
  const booksWithLetter = sortBooksByName(
    allBooks
      .filter(item => {
        const firstChar = getFirstAlphabeticChar(item.book);
        return firstChar === letter;
      })
      .map(item => ({ name: item.book, index: allBooks.findIndex(b => b.book === item.book) }))
  );

  if (booksWithLetter.length > 0) {
    if (letter === getLastSelectedLetter()) {
      setLetterCycleIndex((getLetterCycleIndex() + 1) % booksWithLetter.length);
    } else {
      setLetterCycleIndex(0);
      setLastSelectedLetter(letter);
    }

    const selectedBook = booksWithLetter[getLetterCycleIndex()];
    setCurrentBookIndex(selectedBook.index);
    slider.value = selectedBook.index;
    updateDisplayCallback(selectedBook.index, letter);
  }
}
