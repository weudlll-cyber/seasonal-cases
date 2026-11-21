/**
 * @file   prettier.config.js
 * @brief  Prettier formatting options for the whole repository.
 *
 * Responsibility: the one source of formatting; ESLint stays out of formatting
 *                 (eslint-config-prettier) and lefthook formats staged files.
 */

/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  printWidth: 100,
};

export default config;
