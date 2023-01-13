export interface Snippet {
  readonly id: number;
  readonly group: string;
  readonly name: string;
  readonly description?: string;
  readonly source_code: string;
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

type GenerateRubySnippetParams = {
  filePattern: string,
  rubyVersion: string,
  gemVersion: string,
  snippet: string,
}
export function composeRubyGeneratedSnippet({ filePattern, rubyVersion, gemVersion, snippet }: GenerateRubySnippetParams): string {
  let generatedSnippet = "Synvert::Rewriter.new 'group', 'name' do\n";
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

type GenerateJavascriptSnippetParams = {
  filePattern: string,
  nodeVersion: string,
  npmVersion: string,
  snippet: string,
}
export function composeJavascriptGeneratedSnippet({ filePattern, nodeVersion, npmVersion, snippet }: GenerateJavascriptSnippetParams): string {
  let generatedSnippet = `const Synvert = require("synvert-core");\n\nnew Synvert.Rewriter("group", "name", () => {\n`;
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