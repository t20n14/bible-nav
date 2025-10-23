/**
 * Display manager for updating UI based on application state
 * Handles book view, chapter view, and reading view displays
 */

import { bookSummaries, chapterCounts } from "/data.js";
import { testamentColors } from "./constants.js";
import { sortBooksByName, getFirstAlphabeticChar } from "./bookDataUtils.js";
import { fetchChapter, formatVersesHTML } from "./bibleApiService.js";
import {
  getCurrentBookIndex,
  setCurrentBookIndex,
  getPreviousTestament,
  setPreviousTestament,
  getCurrentChapter,
} from "./navigationState.js";

// Chapter summaries - will be loaded lazily
let chapterSummaries = {};
let chapterSummariesLoaded = false;
let chapterSummariesLoading = false;

/**
 * Initialize chapter summaries (lazy loading)
 * @returns {Promise<Object>} Loaded chapter summaries
 */
async function loadChapterSummaries() {
  if (chapterSummariesLoaded) {
    return chapterSummaries;
  }

  if (chapterSummariesLoading) {
    // Wait for existing load to complete
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (chapterSummariesLoaded) {
          clearInterval(checkInterval);
          resolve(chapterSummaries);
        }
      }, 100);
    });
  }

  chapterSummariesLoading = true;

  try {
    const response = await fetch("/bible-preview-sentence.json");

    // Check if response is actually JSON
    if (!response.ok) {
      console.info("Chapter summaries file not found - feature disabled");
      chapterSummariesLoaded = true;
      chapterSummariesLoading = false;
      return {};
    }

    const data = await response.json();
    chapterSummaries = data;
    chapterSummariesLoaded = true;
    chapterSummariesLoading = false;
    return chapterSummaries;
  } catch (error) {
    console.info("Chapter summaries not available:", error.message);
    chapterSummariesLoaded = true; // Mark as loaded to prevent retry
    chapterSummariesLoading = false;
    return {};
  }
}

// DOM element cache
let domCache = null;

/**
 * Initialize DOM element cache
 * @param {Object} elements - DOM elements to cache
 * Required elements: container, letterDisplay, bookCountDisplay, swipeHint, alphabetNav
 * Optional elements: sliderWrapper
 */
export function initDisplayManager(elements) {
  domCache = {
    ...elements,
    // Query sliderWrapper if not provided
    sliderWrapper: elements.sliderWrapper || document.querySelector(".slider-wrapper"),
  };
}

/**
 * Get cached DOM elements (throws if not initialized)
 * @returns {Object} Cached DOM elements
 */
function getDOMCache() {
  if (!domCache) {
    throw new Error("DisplayManager not initialized. Call initDisplayManager first.");
  }
  return domCache;
}

/**
 * Update display for book browsing mode
 * @param {Array} allBooks - Array of all book data
 * @param {number} index - Current book index
 * @param {string|null} filterLetter - Optional letter filter
 */
export function updateDisplay(allBooks, index, filterLetter = null) {
  const dom = getDOMCache();
  const { container, letterDisplay, bookCountDisplay, swipeHint, alphabetNav } = dom;

  // Set mode class on container
  container.className = "slider-container mode-books";

  setCurrentBookIndex(index);
  const currentItem = allBooks[index];
  const categoryName = currentItem.category;
  const testament = currentItem.testament;
  const categoryBooks = currentItem.categoryBooks;
  const currentBook = currentItem.book;
  const summary = bookSummaries[currentBook];
  const categoryColor = currentItem.categoryColor;
  const bookNumber = index + 1;
  const chapters = chapterCounts[currentBook];

  // Remove reading-mode class if present
  letterDisplay.classList.remove("reading-mode");

  // Only change background when testament changes
  if (testament !== getPreviousTestament()) {
    document.body.style.background = testamentColors[testament];
    setPreviousTestament(testament);
  }

  // Determine which books to display
  let displayBooks;
  let displayCategory;

  if (filterLetter) {
    // Filter books by letter (including numbered books like 1 Corinthians, 2 Corinthians)
    displayBooks = sortBooksByName(
      allBooks
        .filter((item) => {
          // Match the first alphabetic character (skip leading numbers)
          const firstChar = getFirstAlphabeticChar(item.book);
          return firstChar === filterLetter;
        })
        .map((item) => item.book)
    );
    displayCategory = `Books starting with ${filterLetter}`;
  } else {
    // Show category books as usual
    displayBooks = categoryBooks;
    displayCategory = categoryName;
  }

  // Helper function to group numbered books
  function groupNumberedBooks(books) {
    const groups = [];
    let i = 0;

    while (i < books.length) {
      const book = books[i];
      const match = book.match(/^(\d+)\s+(.+)$/);

      if (match) {
        const baseName = match[2];
        const numberedBooks = [book];

        // Look ahead for consecutive numbered books with same base name
        let j = i + 1;
        while (j < books.length) {
          const nextBook = books[j];
          const nextMatch = nextBook.match(/^(\d+)\s+(.+)$/);
          if (nextMatch && nextMatch[2] === baseName) {
            numberedBooks.push(nextBook);
            j++;
          } else {
            break;
          }
        }

        groups.push({ type: "numbered", books: numberedBooks, baseName });
        i = j;
      } else {
        groups.push({ type: "single", book });
        i++;
      }
    }

    return groups;
  }

  const bookGroups = groupNumberedBooks(displayBooks);
  const booksHTML = bookGroups
    .map((group) => {
      if (group.type === "numbered") {
        const numbersHTML = group.books
          .map((book) => {
            const number = book.match(/^(\d+)/)[1];
            const className = book === currentBook ? "book-item active" : "book-item";
            return `<button class="${className}" data-book="${book}">${number}</button>`;
          })
          .join('<span class="book-separator"> | </span>');
        const isGroupActive = group.books.includes(currentBook);
        const baseNameClass = isGroupActive ? "book-base-name active" : "book-base-name";
        return `<span class="book-group">${numbersHTML} <span class="${baseNameClass}">${group.baseName}</span></span>`;
      } else {
        const className = group.book === currentBook ? "book-item active" : "book-item";
        return `<button class="${className}" data-book="${group.book}">${group.book}</button>`;
      }
    })
    .join(" ");

  letterDisplay.innerHTML = `
          <div class="testament">${testament}</div>
          <div class="letter">${displayCategory}</div>
    <div class="books">${booksHTML}</div>
          <div class="chapter-count">${chapters} ${chapters === 1 ? "chapter" : "chapters"}</div>
    <div class="summary">${summary}</div>
      `;

  bookCountDisplay.textContent = `Book ${bookNumber} of 66`;
  swipeHint.textContent = `Swipe, use slider, or select letter\nto explore\n\nTap to select`;

  // Show slider and alphabet nav in book view
  if (dom.sliderWrapper) {
    dom.sliderWrapper.style.display = "block";
  }
  alphabetNav.style.display = "flex";
}

/**
 * Update display for chapter selection mode
 * @param {Array} allBooks - Array of all book data
 */
export async function updateChapterDisplay(allBooks) {
  const dom = getDOMCache();
  const { container, letterDisplay, bookCountDisplay, swipeHint, alphabetNav } = dom;

  // Set mode class on container
  container.className = "slider-container mode-chapters";

  const currentBookIndex = getCurrentBookIndex();
  const currentChapter = getCurrentChapter();
  const currentItem = allBooks[currentBookIndex];
  const currentBook = currentItem.book;
  const chapters = chapterCounts[currentBook];
  const testament = currentItem.testament;
  const categoryName = currentItem.category;

  // Remove reading-mode class if present
  letterDisplay.classList.remove("reading-mode");

  // Only change background when testament changes
  if (testament !== getPreviousTestament()) {
    document.body.style.background = testamentColors[testament];
    setPreviousTestament(testament);
  }

  // Lazy load chapter summaries
  await loadChapterSummaries();

  // Get chapter summary from JSON
  // Handle special case: "Psalms" -> "Psalm" for chapter lookup
  let bookNameForLookup = currentBook;
  if (currentBook === "Psalms") {
    bookNameForLookup = "Psalm";
  }
  const chapterKey = `${bookNameForLookup} ${currentChapter}`;
  const chapterSummary = chapterSummaries[chapterKey] || "";

  letterDisplay.innerHTML = `
          <div class="testament">${testament}</div>
          <div class="letter">${categoryName}</div>
          <div class="chapter-title">${currentBook} ${currentChapter}</div>
          <div class="summary">${chapterSummary}</div>
      `;

  bookCountDisplay.textContent = `Chapter ${currentChapter} of ${chapters}`;
  swipeHint.textContent = "Double-tap to navigate back";

  // Show slider, hide alphabet nav in chapter view
  if (dom.sliderWrapper) {
    dom.sliderWrapper.style.display = "block";
  }
  alphabetNav.style.display = "none";
}

/**
 * Update display for reading mode (full chapter text)
 * @param {Array} allBooks - Array of all book data
 */
export async function updateReadingDisplay(allBooks) {
  const dom = getDOMCache();
  const { container, letterDisplay, bookCountDisplay, swipeHint, alphabetNav } = dom;

  // Set mode class on container
  container.className = "slider-container mode-reading";

  const currentBookIndex = getCurrentBookIndex();
  const currentChapter = getCurrentChapter();
  const currentItem = allBooks[currentBookIndex];
  const currentBook = currentItem.book;
  const testament = currentItem.testament;

  // Add reading-mode class to reduce top spacing
  letterDisplay.classList.add("reading-mode");

  // Show loading state
  letterDisplay.innerHTML = `
    <div class="chapter-title">${currentBook} ${currentChapter}</div>
    <div class="chapter-content">
      <div class="loading-spinner">Loading...</div>
    </div>
  `;

  // Apply testament background color to chapter title
  const chapterTitleElement = letterDisplay.querySelector(".chapter-title");
  if (chapterTitleElement) {
    chapterTitleElement.style.background = testamentColors[testament];
  }

  bookCountDisplay.textContent = "";
  swipeHint.textContent = "Double-tap to navigate back";

  // Hide slider and alphabet nav in reading view
  if (dom.sliderWrapper) {
    dom.sliderWrapper.style.display = "none";
  }
  alphabetNav.style.display = "none";

  // Fetch and display Bible verses
  try {
    const chapterData = await fetchChapter(currentBook, currentChapter);
    const versesHTML = formatVersesHTML(chapterData);

    letterDisplay.innerHTML = `
      <div class="chapter-title">${currentBook} ${currentChapter}</div>
      ${versesHTML}
    `;

    // Apply testament background color to chapter title
    const chapterTitleElement = letterDisplay.querySelector(".chapter-title");
    if (chapterTitleElement) {
      chapterTitleElement.style.background = testamentColors[testament];
    }
  } catch (error) {
    console.error("Error loading Bible chapter:", error);
    letterDisplay.innerHTML = `
      <div class="chapter-title">${currentBook} ${currentChapter}</div>
      <div class="chapter-content">
        <div class="error-message">
          Unable to load chapter content. Please check your internet connection and try again.
        </div>
      </div>
    `;

    // Apply testament background color to chapter title
    const chapterTitleElement = letterDisplay.querySelector(".chapter-title");
    if (chapterTitleElement) {
      chapterTitleElement.style.background = testamentColors[testament];
    }
  }
}
