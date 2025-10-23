/**
 * Book data utilities for processing and organizing Bible book information
 * Provides helper functions for sorting, filtering, and building book data structures
 */

import { categories } from '/data.js';

/**
 * Extract the first alphabetic character from a book name
 * Useful for alphabet navigation, ignores leading numbers (e.g., "1 Corinthians" -> "C")
 *
 * @param {string} bookName - Book name (e.g., "Genesis", "1 John")
 * @returns {string|undefined} First alphabetic character in uppercase, or undefined if none found
 *
 * @example
 * getFirstAlphabeticChar("Genesis") // Returns "G"
 * getFirstAlphabeticChar("1 John") // Returns "J"
 * getFirstAlphabeticChar("123") // Returns undefined
 */
export function getFirstAlphabeticChar(bookName) {
  return bookName.match(/[A-Z]/)?.[0];
}

/**
 * Sort books alphabetically by name, handling numbered books intelligently
 * Numbered books with the same base name are grouped together numerically
 *
 * @param {Array<string|{name: string}>} books - Array of book names or objects with name property
 * @returns {Array} Sorted array of books
 *
 * @example
 * sortBooksByName(["2 John", "1 John", "John"]) // Returns ["1 John", "2 John", "John"]
 * sortBooksByName(["Zephaniah", "Genesis"]) // Returns ["Genesis", "Zephaniah"]
 */
export function sortBooksByName(books) {
  return books.sort((a, b) => {
    const aName = a.name || a;
    const bName = b.name || b;
    const aBase = aName.replace(/^\d+\s*/, '');
    const bBase = bName.replace(/^\d+\s*/, '');

    // If same base name, sort by number
    if (aBase === bBase) {
      return aName.localeCompare(bName, undefined, { numeric: true });
    }
    // Otherwise sort alphabetically by base name
    return aBase.localeCompare(bBase);
  });
}

/**
 * Build flat array of all books with enriched metadata
 * Transforms category-based book data into a flat array with additional context
 *
 * @returns {Array<Object>} Array of book objects with metadata
 *
 * @typedef {Object} BookData
 * @property {string} book - Book name
 * @property {string} category - Category name (e.g., "Law", "Gospels")
 * @property {string} testament - "Old Testament" or "New Testament"
 * @property {Array<string>} categoryBooks - All books in the same category
 * @property {string} categoryColor - Gradient color for the category
 *
 * @example
 * const allBooks = buildAllBooks();
 * // Returns: [
 * //   { book: "Genesis", category: "Law", testament: "Old Testament", ... },
 * //   { book: "Exodus", category: "Law", testament: "Old Testament", ... },
 * //   ...
 * // ]
 */
export function buildAllBooks() {
  const allBooks = [];
  categories.forEach((category) => {
    category.books.forEach((book) => {
      allBooks.push({
        book,
        category: category.name,
        testament: category.testament,
        categoryBooks: category.books,
        categoryColor: category.color,
      });
    });
  });
  return allBooks;
}

/**
 * Create letter-to-index mapping for quick alphabet navigation
 * Maps each alphabetic letter to the index of the first book starting with that letter
 *
 * @param {Array<Object>} allBooks - Array of book data from buildAllBooks()
 * @returns {Object<string, number>} Object mapping letters to book indices
 *
 * @example
 * const letterMap = buildLetterToBookIndex(allBooks);
 * // Returns: { "G": 0, "E": 1, "L": 2, ... }
 * // letterMap["G"] gives index of "Genesis" (first book starting with G)
 */
export function buildLetterToBookIndex(allBooks) {
  const letterToBookIndex = {};
  allBooks.forEach((item, index) => {
    const firstChar = getFirstAlphabeticChar(item.book);
    if (firstChar && !letterToBookIndex[firstChar]) {
      letterToBookIndex[firstChar] = index;
    }
  });
  return letterToBookIndex;
}
