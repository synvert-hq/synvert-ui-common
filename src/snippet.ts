import type { Snippet, GenerateRubySnippetParams, GenerateJavascriptSnippetParams, GenerateSnippetParams } from './types';

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