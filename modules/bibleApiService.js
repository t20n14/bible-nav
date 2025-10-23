import { bookAbbreviations } from "/data.js";

// API configuration
const API_BASE_URL = "https://bible.helloao.org/api";
const DEFAULT_TRANSLATION = "BSB"; // Berean Standard Bible (KJV not available in this API)

// In-memory cache for API responses
const chapterCache = new Map();

/**
 * Get the API abbreviation for a book name
 * @param {string} bookName - Full book name (e.g., "Genesis", "1 Corinthians")
 * @returns {string} API abbreviation (e.g., "GEN", "1CO")
 */
function getBookAbbreviation(bookName) {
  const abbrev = bookAbbreviations[bookName];
  if (!abbrev) {
    console.error(`No abbreviation found for book: ${bookName}`);
    throw new Error(`Unknown book: ${bookName}`);
  }
  return abbrev;
}

/**
 * Generate cache key for a chapter
 * @param {string} translation - Bible translation (e.g., "KJV")
 * @param {string} book - Book abbreviation
 * @param {number} chapter - Chapter number
 * @returns {string} Cache key
 */
function getCacheKey(translation, book, chapter) {
  return `${translation}:${book}:${chapter}`;
}

/**
 * Fetch a Bible chapter from the API
 * @param {string} bookName - Full book name (e.g., "Genesis")
 * @param {number} chapter - Chapter number
 * @param {string} translation - Bible translation (default: "KJV")
 * @returns {Promise<Object>} Chapter data with verses
 */
export async function fetchChapter(bookName, chapter, translation = DEFAULT_TRANSLATION) {
  const bookAbbrev = getBookAbbreviation(bookName);
  const cacheKey = getCacheKey(translation, bookAbbrev, chapter);

  // Check cache first
  if (chapterCache.has(cacheKey)) {
    return chapterCache.get(cacheKey);
  }

  // Fetch from API
  const url = `${API_BASE_URL}/${translation}/${bookAbbrev}/${chapter}.json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the response
    chapterCache.set(cacheKey, data);

    return data;
  } catch (error) {
    console.error(`Error fetching chapter ${bookName} ${chapter}:`, error);
    throw error;
  }
}

/**
 * Parse content item (can be string or object with text/poem/noteId/lineBreak)
 * @param {string|Object} contentItem - Content item from API
 * @param {Map} footnotesMap - Map of noteId to footnote objects
 * @returns {string} Parsed text
 */
function parseContentItem(contentItem, footnotesMap) {
  if (typeof contentItem === "string") {
    return contentItem;
  }
  if (contentItem.text) {
    return contentItem.text;
  }
  if (contentItem.noteId !== undefined) {
    const footnote = footnotesMap.get(contentItem.noteId);
    const caller = footnote ? footnote.caller : contentItem.noteId;
    return `<sup class="footnote-ref" data-note-id="${contentItem.noteId}">${caller}</sup>`;
  }
  if (contentItem.lineBreak) {
    return "<br>";
  }
  return "";
}

/**
 * Format verses for display
 * @param {Object} chapterData - Chapter data from API
 * @returns {string} HTML string with formatted verses
 */
export function formatVersesHTML(chapterData) {
  if (!chapterData || !chapterData.chapter || !chapterData.chapter.content) {
    console.error("Invalid chapter data structure:", chapterData);
    return '<div class="error-message">No verse data available</div>';
  }

  const content = chapterData.chapter.content;
  const footnotes = chapterData.chapter.footnotes || [];

  // Create a map of noteId to footnote for quick lookup
  const footnotesMap = new Map();
  footnotes.forEach((footnote) => {
    footnotesMap.set(footnote.noteId, footnote);
  });

  // Process each content item (headings, verses, line breaks)
  const versesHTML = content
    .map((item) => {
      if (item.type === "heading") {
        const headingContent = item.content.map((c) => parseContentItem(c, footnotesMap)).join("");
        return `<div class="chapter-heading">${headingContent}</div>`;
      }
      if (item.type === "line_break") {
        return "<br>";
      }
      if (item.type === "verse") {
        const verseNumber = item.number;
        const verseContent = item.content.map((c) => parseContentItem(c, footnotesMap)).join("");
        return `<span class="verse"><span class="verse-number">${verseNumber}</span> <span class="verse-text">${verseContent}</span></span>`;
      }
      return "";
    })
    .filter((html) => html !== "")
    .join(" ");

  // Build footnotes section if footnotes exist
  let footnotesHTML = "";
  if (footnotes.length > 0) {
    const footnoteItems = footnotes
      .map((footnote) => {
        const ref = `${footnote.reference.chapter}:${footnote.reference.verse}`;
        return `<div class="footnote-item" id="footnote-${footnote.noteId}">
          <span class="footnote-caller">${footnote.caller}</span>
          <span class="footnote-reference">(${ref})</span>
          <span class="footnote-text">${footnote.text}</span>
        </div>`;
      })
      .join("");

    footnotesHTML = `<div class="footnotes-section">
      <div class="footnotes-title">Cross-References & Notes</div>
      ${footnoteItems}
    </div>`;
  }

  return `<div class="chapter-content">${versesHTML}${footnotesHTML}</div>`;
}

/**
 * Clear the chapter cache (useful for memory management)
 */
export function clearCache() {
  chapterCache.clear();
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  return {
    size: chapterCache.size,
    keys: Array.from(chapterCache.keys()),
  };
}
