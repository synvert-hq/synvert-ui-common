import { compareVersions } from 'compare-versions';

import { PARSERS, FILE_PATTERNS, PLACEHOLDERS } from './constants';
import type { Snippet, GenerateRubySnippetParams, GenerateJavascriptSnippetParams, GenerateSnippetParams, RunCommandType } from './types';
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
    !stderr.startsWith("error: pathspec '.' did not match any file(s) known to git") &&
    !stderr.startsWith('npm WARN') && // npm install
    !stderr.startsWith('Updated 0 paths from the index') // git pull
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
 * @returns { { output: string, error: string } }
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

/**
 * Runs synvert-ruby command line.
 * @param {Function} runCommand - The function to run the command.
 * @param {string} executeCommand - The command to execute ("run" or "test").
 * @param {string} rootPath - The root path.
 * @param {string} onlyPaths - The paths to include.
 * @param {string} skipPaths - The paths to skip.
 * @param {string[]} additionalArgs - Additional arguments for the command.
 * @param {string} snippetCode - The code snippet to process.
 * @returns A promise that resolves to an object containing the output and error messages.
 */
export async function runSynvertRuby(
  runCommand: RunCommandType,
  executeCommand: "run" | "test",
  rootPath: string,
  onlyPaths: string,
  skipPaths: string,
  additionalArgs: string[],
  snippetCode: string,
) {
  const commandArgs = buildRubyCommandArgs(executeCommand, rootPath, onlyPaths, skipPaths, additionalArgs);
  return await runCommand("synvert-ruby", commandArgs, { input: snippetCode })
}

export function buildRubyCommandArgs(
  executeCommand: "run" | "test",
  rootPath: string,
  onlyPaths: string,
  skipPaths: string,
  additionalArgs: string[],
): string[] {
  const commandArgs = ["--execute", executeCommand];
  if (executeCommand === "run") {
    commandArgs.push("--format");
    commandArgs.push("json");
  }
  if (onlyPaths.length > 0) {
    commandArgs.push("--only-paths");
    commandArgs.push(onlyPaths);
  }
  if (skipPaths.length > 0) {
    commandArgs.push("--skip-paths");
    commandArgs.push(skipPaths);
  }
  commandArgs.push(...additionalArgs);
  commandArgs.push(rootPath);
  return commandArgs;
}

/**
 * Runs synvert-javascript command line.
 * @param {Function} runCommand - The function to run the command.
 * @param {string} executeCommand - The command to execute ("run" or "test").
 * @param {string} rootPath - The root path.
 * @param {string} onlyPaths - The paths to include.
 * @param {string} skipPaths - The paths to skip.
 * @param {Object} additionalArgs - Additional arguments for the command.
 * @param {string} snippetCode - The code snippet to process.
 * @returns A promise that resolves to an object containing the output and error messages.
 */
export async function runSynvertJavascript(
  runCommand: RunCommandType,
  executeCommand: "run" | "test",
  rootPath: string,
  onlyPaths: string,
  skipPaths: string,
  additionalArgs: string[],
  snippetCode: string,
) {
  const commandArgs = buildJavascriptCommandArgs(executeCommand, rootPath, onlyPaths, skipPaths, additionalArgs);
  return await runCommand("synvert-javascript", commandArgs, { input: snippetCode })
}

export function buildJavascriptCommandArgs(
  executeCommand: "run" | "test",
  rootPath: string,
  onlyPaths: string,
  skipPaths: string,
  additionalArgs: string[],
): string[] {
  const commandArgs = ["--execute", executeCommand];
  if (executeCommand === "run") {
    commandArgs.push("--format");
    commandArgs.push("json");
  }
  if (onlyPaths.length > 0) {
    commandArgs.push("--only-paths");
    commandArgs.push(onlyPaths);
  }
  if (skipPaths.length > 0) {
    commandArgs.push("--skip-paths");
    commandArgs.push(skipPaths);
  }
  commandArgs.push(...additionalArgs);
  commandArgs.push("--root-path");
  commandArgs.push(rootPath);
  return commandArgs;
}

export enum DependencyResponse {
  OK,
  RUBY_NOT_AVAILABLE,
  JAVASCRIPT_NOT_AVAILABLE,
  SYNVERT_NOT_AVAILABLE,
  SYNVERT_OUTDATED,
  SYNVERT_CORE_OUTDATED,
  ERROR,
}

type CheckDependencyResult = {
  code: DependencyResponse;
  error?: string;
  remoteSynvertVersion?: string;
  localSynvertVersion?: string;
  remoteSynvertCoreVersion?: string;
  localSynvertCoreVersion?: string;
}

const VERSION_REGEXP = /(\d+\.\d+\.\d+) \(with synvert-core (\d+\.\d+\.\d+)/;

async function checkGemRemoteVersions(): Promise<{ synvertVersion: string, synvertCoreVersion: string }> {
  const url = "https://api-ruby.synvert.net/check-versions";
  const response = await fetch(url);
  const data = await response.json();
  const { synvert_version, synvert_core_version } = data as { synvert_version: string, synvert_core_version: string };
  return { synvertVersion: synvert_version, synvertCoreVersion: synvert_core_version };
}

/**
 * Checks the Ruby dependencies required for the application.
 *
 * @param {Function} runCommand - The function used to run commands.
 * @returns A promise that resolves to a CheckDependencyResult object.
 */
export async function checkRubyDependencies(runCommand: RunCommandType): Promise<CheckDependencyResult> {
  try {
    const { error: rubyError } = await runCommand("ruby", ["-v"]);
    if (rubyError) {
      return { code: DependencyResponse.RUBY_NOT_AVAILABLE };
    }
    const { output, error } = await runCommand("synvert-ruby", ["-v"]);
    if (error) {
      return { code: DependencyResponse.SYNVERT_NOT_AVAILABLE };
    }
    const result = output.match(VERSION_REGEXP);
    if (result) {
      const localSynvertVersion = result[1];
      const localSynvertCoreVersion = result[2];
      const data = await checkGemRemoteVersions();
      console.log('data', data)
      const remoteSynvertVersion = data.synvertVersion;
      const remoteSynvertCoreVersion = data.synvertCoreVersion;
      if (compareVersions(remoteSynvertVersion, localSynvertVersion) === 1) {
        return { code: DependencyResponse.SYNVERT_OUTDATED, remoteSynvertVersion, localSynvertVersion };
      }
      if (compareVersions(remoteSynvertCoreVersion, localSynvertCoreVersion) === 1) {
        return { code: DependencyResponse.SYNVERT_CORE_OUTDATED, remoteSynvertCoreVersion, localSynvertCoreVersion };
      }
      return { code: DependencyResponse.OK };
    } else {
      return { code: DependencyResponse.SYNVERT_NOT_AVAILABLE };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { code: DependencyResponse.ERROR, error: error.message };
    }
    return { code: DependencyResponse.ERROR, error: String(error) };
  }
}

async function checkNpmRemoteVersions(): Promise<{ synvertVersion: string, synvertCoreVersion: string }> {
  const url = "https://api-javascript.synvert.net/check-versions";
  const response = await fetch(url);
  const data = await response.json();
  const { synvert_version, synvert_core_version } = data as { synvert_version: string, synvert_core_version: string };
  return { synvertVersion: synvert_version, synvertCoreVersion: synvert_core_version };
}

/**
 * Checks the JavaScript dependencies.
 * @param {Function} runCommand - The function to run a command.
 * @returns A promise that resolves to a CheckDependencyResult object.
 */
export async function checkJavascriptDependencies(runCommand: RunCommandType): Promise<CheckDependencyResult> {
  try {
    const { error: javascriptError } = await runCommand("node", ["-v"]);
    if (javascriptError) {
      return { code: DependencyResponse.JAVASCRIPT_NOT_AVAILABLE };
    }
    const { output, error } = await runCommand("synvert-javascript", ["-v"]);
    if (error) {
      return { code: DependencyResponse.SYNVERT_NOT_AVAILABLE };
    }
    const result = output.match(VERSION_REGEXP);
    if (result) {
      const localSynvertVersion = result[1];
      const data = await checkNpmRemoteVersions();
      const remoteSynvertVersion = data.synvertVersion;
      // const remoteSynvertCoreVersion = data.synvertCoreVersion;
      if (compareVersions(remoteSynvertVersion, localSynvertVersion) === 1) {
        return { code: DependencyResponse.SYNVERT_OUTDATED, remoteSynvertVersion, localSynvertVersion };
      }
      return { code: DependencyResponse.OK };
    } else {
      return { code: DependencyResponse.SYNVERT_NOT_AVAILABLE };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { code: DependencyResponse.ERROR, error: error.message };
    }
    return { code: DependencyResponse.ERROR, error: String(error) };
  }
}
