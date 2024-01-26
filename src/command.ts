import { compareVersions } from 'compare-versions';

import { PromiseFsAPI, PathAPI, RunCommandType, SearchResults, TestResultExtExt } from './types';

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

// synvert-ruby in ruby 3.3 will output "Resolving dependencies...\n",
// which we should strip.
function stripOutput(stdout: string): string {
  return stdout.replace(/^Resolving dependencies...\n/, "");
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
  return { output: stripOutput(stdout), error };
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
 * @returns {Promise<{output: string, error: string | undefined}>} A promise that resolves to an object containing the output and error messages.
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

function buildRubyCommandArgs(
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
 * @returns {Promise<{output: string, error: string | undefined}>} A promise that resolves to an object containing the output and error messages.
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

function buildJavascriptCommandArgs(
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
 * @returns {Promise<{code: DependencyResponse, error: string | undefined}>} A promise that resolves to a CheckDependencyResult object.
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
 * @returns {Promise<{code: DependencyResponse, error: string | undefined}>} A promise that resolves to a CheckDependencyResult object.
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

function mergeRenameFileTestResults(snippets: TestResultExtExt[]) {
  const renameFileResults = snippets.filter(snippet => snippet.actions[0].type === "rename_file");
  if (renameFileResults.length === 0) {
    return snippets;
  }
  renameFileResults.forEach(renameFileResult => {
    snippets.filter(snippet => snippet != renameFileResult && snippet.filePath === renameFileResult.filePath)
            .forEach(snippet => renameFileResult.actions = [...renameFileResult.actions, ...snippet.actions]);
  });
  const renameFileResultFilePaths = renameFileResults.map(renameFileResult => renameFileResult.filePath);
  return [...snippets.filter(snippet => !renameFileResultFilePaths.includes(snippet.filePath)), ...renameFileResults];
}

async function addFileSourceToSnippets(snippets: TestResultExtExt[], rootPath: string, pathAPI: PathAPI, fsAPI: PromiseFsAPI) {
  for (const snippet of snippets) {
    const absolutePath = pathAPI.join(rootPath, snippet.filePath);
    if (!!(await fsAPI.stat(absolutePath).catch(e => false))) {
      const fileSource = await fsAPI.readFile(absolutePath, "utf-8");
      snippet.fileSource = fileSource;
    }
    snippet.rootPath = rootPath;
  }
  return snippets;
}

/**
 * Handles the test results.
 * @param {string} output output of run command
 * @param {string} error  error of run command
 * @param {string} rootPath root path
 * @param {object} pathAPI api of path
 * @param {object} fsAPI api of fs/promises
 * @returns {Promise<SearchResults>} search results
 */
export async function handleTestResults(output: string, error: string | undefined, rootPath: string, pathAPI: PathAPI, fsAPI: PromiseFsAPI): Promise<SearchResults> {
  if (error) {
    return { results: [], errorMessage: error };
  }
  try {
    const results = parseJSON(output);
    if (results.error) {
      return { results: [], errorMessage: results.error };
    }
    const snippets = await addFileSourceToSnippets(mergeRenameFileTestResults(results), rootPath, pathAPI, fsAPI);
    return { results: snippets, errorMessage: "" };
  } catch (e) {
    return { results: [], errorMessage: (e as Error).message };
  }
}

const snakeToCamel = (str: string): string => str.replace(/([-_]\w)/g, g => g[1].toUpperCase());

/**
 * Parse json string to JSON object, with camel case keys.
 * @param {string} json string
 * @returns {object} JSON object
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
