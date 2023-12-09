import { PARSERS, FILE_PATTERNS, PLACEHOLDERS } from './constant';

export { formatCommandResult, runSynvertRuby, runSynvertJavascript, checkRubyDependencies, checkJavascriptDependencies } from './command';
export { filterSnippets, sortSnippets, composeGeneratedSnippets } from './snippet';
export { replaceTestResult, replaceTestAction } from './action';
export type { DependencyResponse } from './command';
export type { Snippet } from "./types";

/**
 * Get file pattern by language.
 * @param {string} language
 * @returns {string}
 */
export function filePatternByLanguage(language: string): string {
  return FILE_PATTERNS[language];
}

/**
 * Get placeholder by language.
 * @param {string} language
 * @returns {string}
 */
export function placeholderByLanguage(language: string): { [name: string]: string } {
  return PLACEHOLDERS[language];
}

/**
 * Get parsers by language.
 * @param {string} language
 * @returns {string[]}
 */
export function parsersByLanguage(language: string): string[] {
  return PARSERS[language];
}

const snakeToCamel = (str: string): string => str.replace(/([-_]\w)/g, g => g[1].toUpperCase());

/**
 * Parse json string to JSON object, with camel case keys.
 * @param str json string
 * @returns JSON object
 */
export const parseJSON = (str: string) => {
  return JSON.parse(str, function(key, value) {
    const camelCaseKey = snakeToCamel(key);

    if (this instanceof Array || camelCaseKey === key) {
      return value;
    } else {
      this[camelCaseKey] = value;
    }
  });
};
