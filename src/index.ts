import { PARSERS, FILE_PATTERNS, PLACEHODERS } from './constants';
import type { Snippet, GenerateRubySnippetParams, GenerateJavascriptSnippetParams, GenerateSnippetParams } from './types';
export type { Snippet };

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
  return PLACEHODERS[language];
}

/**
 * Get parsers by language.
 * @param {string} language
 * @returns {string[]}
 */
export function parsersByLanguage(language: string): string[] {
  return PARSERS[language];
}

/**
 * Filter snippets by text.
 * @param {Snippet[]} snippets
 * @param {string} text
 * @returns {Snippet[]}
 */
export function filterSnippets(snippets: Snippet[], text: string): Snippet[] {
  const lowerCaseText = text.toLowerCase();
  return snippets.filter(snippet => (
    snippet.group.toLowerCase().includes(lowerCaseText) ||
    snippet.name.toLowerCase().includes(lowerCaseText) ||
    (!!snippet.description && snippet.description.toLowerCase().includes(lowerCaseText))
  ));
}

/**
 * Sort snippets by text.
 * @param {Snippet[]} snippets
 * @param {string} text
 * @returns {Snippet[]}
 */
export function sortSnippets(snippets: Snippet[], text: string): Snippet[] {
  const lowerCaseText = text.toLowerCase();
  return snippets.sort((a: Snippet, b: Snippet) => {
    if (a.group.toLowerCase().includes(lowerCaseText) && !b.group.toLowerCase().includes(lowerCaseText)) return -1;
    if (!a.group.toLowerCase().includes(lowerCaseText) && b.group.toLowerCase().includes(lowerCaseText)) return 1;
    if (a.name.toLowerCase().includes(lowerCaseText) && !b.name.toLowerCase().includes(lowerCaseText)) return -1;
    if (!a.name.toLowerCase().includes(lowerCaseText) && b.name.toLowerCase().includes(lowerCaseText)) return 1;
    if (`${a.group}/${a.name}` < `${b.group}/${b.name}`) return -1;
    if (`${a.group}/${a.name}` > `${b.group}/${b.name}`) return 1;
    return 0;
  });
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

function composeRubyGeneratedSnippet({ filePattern, rubyVersion, gemVersion, snippet, parser }: GenerateRubySnippetParams): string {
  let generatedSnippet = `Synvert::Rewriter.new 'group', 'name' do\n  configure(parser: Synvert::${parser.toUpperCase()}_PARSER)\n`;
  if (rubyVersion) {
    generatedSnippet += `  if_ruby '${rubyVersion}'\n`;
  }
  if (gemVersion) {
    const index = gemVersion.indexOf(" ");
    const name = gemVersion.substring(0, index);
    const version = gemVersion.substring(index + 1);
    generatedSnippet += `  if_gem '${name}', '${version}'\n`;
  }
  generatedSnippet += `  within_files '${filePattern}' do\n`;
  if (snippet) {
    generatedSnippet += "    ";
    generatedSnippet += snippet.replace(/\n/g, "\n    ");
    generatedSnippet += "\n";
  }
  generatedSnippet += "  end\n";
  generatedSnippet += "end";
  return generatedSnippet;
};

function composeJavascriptGeneratedSnippet({ filePattern, nodeVersion, npmVersion, snippet, parser }: GenerateJavascriptSnippetParams): string {
  let generatedSnippet = `new Synvert.Rewriter("group", "name", () => {\n  configure({ parser: Synvert.Parser.${parser.toUpperCase()} });\n`;
  if (nodeVersion) {
    generatedSnippet += `  ifNode("${nodeVersion}");\n`;
  }
  if (npmVersion) {
    const index = npmVersion.indexOf(" ");
    const name = npmVersion.substring(0, index);
    const version = npmVersion.substring(index + 1);
    generatedSnippet += `  ifNpm("${name}", "${version}");\n`;
  }
  generatedSnippet += `  withinFiles("${filePattern}", () => {\n`;
  if (snippet) {
    generatedSnippet += "    ";
    generatedSnippet += snippet.replace(/\n/g, "\n    ");
    generatedSnippet += "\n";
  }
  generatedSnippet += "  });\n";
  generatedSnippet += "});";
  return generatedSnippet;
};

/**
 * Compose generated snippets.
 * @param data {GenerateSnippetParams}
 * @returns {string[]}
 */
export function composeGeneratedSnippets(data: GenerateSnippetParams): string[] {
  if (data.language === "ruby") {
    return data.snippets.map((snippet) => composeRubyGeneratedSnippet({
      filePattern: data.filePattern,
      rubyVersion: data.rubyVersion,
      gemVersion: data.gemVersion,
      parser: data.parser,
      snippet,
    }));
  } else {
    return data.snippets.map((snippet) => composeJavascriptGeneratedSnippet({
      filePattern: data.filePattern,
      nodeVersion: data.nodeVersion,
      npmVersion: data.npmVersion,
      parser: data.parser,
      snippet,
    }));
  }
}

function isRealError(stderr: string): boolean {
  return (
    Boolean(stderr) &&
    !stderr.startsWith('warning:') &&
    !stderr.startsWith('Cloning into ') &&
    !stderr.startsWith("error: pathspec '.' did not match any file(s) known to git")
  );
}

function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function outputContainsError(stdout: string): boolean {
  return (
    Boolean(stdout) &&
    isJsonString(stdout) &&
    JSON.parse(stdout).error
  );
}

/**
 * Format shell command result, convert stdout and stderr to a json object { output, error }.
 * @param {string} stdout
 * @param {string} stderr
 * @returns { output: string, error: string }
 */
export function formatCommandResult({ stdout, stderr }: { stdout: string, stderr: string }): { output: string, error?: string } {
  let error;
  if (isRealError(stderr)) {
    error = stderr;
  }
  if (outputContainsError(stdout)) {
    error = JSON.parse(stdout).error;
  }
  return { output: stdout, error };
}
