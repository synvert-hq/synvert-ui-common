import { PARSERS, FILE_PATTERNS, PLACEHOLDERS } from './constant';
import { LANGUAGE } from './types';

export { formatCommandResult, handleTestResults, runSynvertRuby, runSynvertJavascript, checkRubyDependencies, checkJavascriptDependencies, DependencyResponse } from './command';
export { filterSnippets, sortSnippets, fetchSnippets, generateSnippets } from './snippet';
export { getNewSourceByTestResult, removeTestAction, removeTestResult, replaceAllTestResults, replaceTestResult, replaceTestAction } from './action';
export type { Snippet, LANGUAGE, GenerateSnippetsParams } from "./types";

/**
 * Get file pattern by language.
 * @param {LANGUAGE} language
 * @returns {string}
 */
export function filePatternByLanguage(language: LANGUAGE): string {
  return FILE_PATTERNS[language];
}

/**
 * Get placeholder by language.
 * @param {LANGUAGE} language
 * @returns {string}
 */
export function placeholderByLanguage(language: LANGUAGE): { [name: string]: string } {
  return PLACEHOLDERS[language];
}

/**
 * Get parsers by language.
 * @param {LANGUAGE} language
 * @returns {string[]}
 */
export function parsersByLanguage(language: LANGUAGE): string[] {
  return PARSERS[language];
}
