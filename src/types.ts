export interface Snippet {
  readonly id: number;
  readonly group: string;
  readonly name: string;
  readonly description?: string;
  readonly source_code: string;
}

export type GenerateRubySnippetParams = {
  filePattern: string,
  rubyVersion: string,
  gemVersion: string,
  snippet: string,
  parser: string,
}

export type GenerateJavascriptSnippetParams = {
  filePattern: string,
  nodeVersion: string,
  npmVersion: string,
  snippet: string,
  parser: string,
}

export type GenerateSnippetParams = {
  language: "ruby",
  parser: string,
  rubyVersion: string,
  gemVersion: string,
  filePattern: string,
  snippets: string[],
} | {
  language: "javascript" | "typescript" | "css" | "less" | "sass" | "scss",
  parser: string,
  nodeVersion: string,
  npmVersion: string,
  filePattern: string,
  snippets: string[],
};

export type RunCommandType = (command: string, args: string[], options?: { input?: string }) => Promise<{ output: string, error?: string }>;
