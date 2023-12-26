import { PARSERS, FILE_PATTERNS, PLACEHOLDERS } from './constant';

export { formatCommandResult, handleTestResults, runSynvertRuby, runSynvertJavascript, checkRubyDependencies, checkJavascriptDependencies, DependencyResponse } from './command';
export { filterSnippets, sortSnippets, fetchSnippets, generateSnippets } from './snippet';
export { replaceAllTestResults, replaceTestResult, replaceTestAction } from './action';
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
