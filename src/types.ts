import path from "path";
import fs from "fs/promises";

export interface Snippet {
  readonly id: number;
  readonly group: string;
  readonly name: string;
  readonly description?: string;
  readonly source_code: string;
}

export type LANGUAGE = "ruby" | "javascript" | "typescript" | "css" | "less" | "sass" | "scss";
export type RUBY_PARSER = "parser" | "syntax_tree";
export type JAVASCRIPT_PARSER = "espree" | "typescript";
export type TYPESCRIPT_PARSER = "typescript";
export type CSS_PARSER = "gonzales-pe";

export type ComposeRubySnippetParams = {
  filePattern: string,
  rubyVersion: string,
  gemVersion: string,
  snippet: string,
  parser: string,
}

export type ComposeJavascriptSnippetParams = {
  filePattern: string,
  nodeVersion: string,
  npmVersion: string,
  snippet: string,
  parser: string,
}

export type GenerateSnippetsParams = {
  language: "ruby",
  parser: string,
  filePattern: string,
  rubyVersion: string,
  gemVersion: string,
  inputs: string[],
  outputs: string[],
  nqlOrRules: boolean,
} | {
  language: "javascript" | "typescript" | "css" | "less" | "sass" | "scss",
  parser: string,
  filePattern: string,
  nodeVersion: string,
  npmVersion: string,
  inputs: string[],
  outputs: string[],
  nqlOrRules: boolean,
}

export type RunCommandType = (command: string, args: string[], options?: { input?: string }) => Promise<{ output: string, error?: string }>;

// Copy from @xinminlabs/node-mutation
export type Action = {
  type: string;
  start: number;
  end: number;
  newCode?: string;
  conflictPosition?: number;
  actions?: Action[];
};

type TestResult = {
  affected: boolean;
  conflicted: boolean;
  actions: Action[];
};

// Copy from synvert-core
type TestResultExt = TestResult & { filePath: string, newFilePath?: string };

export type TestResultExtExt = TestResultExt & { rootPath?: string, fileSource?: string };

export type SearchResults = { results: TestResultExtExt[], errorMessage: string };

export type PathAPI = typeof path;

export type PromiseFsAPI = typeof fs;
