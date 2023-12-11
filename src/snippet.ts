import type { Snippet, ComposeRubySnippetParams, ComposeJavascriptSnippetParams, LANGUAGE, GenerateSnippetsParams } from './types';

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

function composeRubyGeneratedSnippet({ filePattern, rubyVersion, gemVersion, snippet, parser }: ComposeRubySnippetParams): string {
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

function composeJavascriptGeneratedSnippet({ filePattern, nodeVersion, npmVersion, snippet, parser }: ComposeJavascriptSnippetParams): string {
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

function baseUrlByLanguage(language: LANGUAGE): string {
  return language === "ruby" ? "https://api-ruby.synvert.net" : "https://api-javascript.synvert.net";
}

export async function fetchSnippets(language: LANGUAGE, token: string, platform: string) {
  const url = `${baseUrlByLanguage(language)}/snippets?language=${language}`;
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        // @ts-ignore
        "X-SYNVERT-TOKEN": token,
        "X-SYNVERT-PLATFORM": platform,
      }
    })
    const data = await response.json();
    return { snippets: data.snippets.map((snippet: Snippet) => (
      {
        ...snippet,
        id: `${snippet.group}/${snippet.name}`,
      }
    )) };
  } catch (error) {
    return { errorMessage: (error as Error).message };
  }
}

export async function generateSnippets(token: string, platform: string, params: GenerateSnippetsParams) {
  const { language, parser, filePattern, inputs, outputs, nqlOrRules } = params;
  const url = `${baseUrlByLanguage(language)}/generate-snippet`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // @ts-ignore
        "X-SYNVERT-TOKEN": token,
        "X-SYNVERT-PLATFORM": platform,
      },
      body: JSON.stringify({ language, inputs, outputs, nql_or_rules: nqlOrRules })
    })
    const data = await response.json();
    if (data.error) {
      return { errorMessage: data.error };
    } else if (data.snippets.length === 0) {
      return { errorMessage: "Failed to generate snippet" };
    } else {
      if (language === "ruby")  {
        const { rubyVersion, gemVersion } = params;
        const generatedSnippets = (data.snippets as string[]).map((snippet) => composeRubyGeneratedSnippet({
          parser,
          filePattern,
          rubyVersion,
          gemVersion,
          snippet,
        }));
        return { generatedSnippets };
      } else {
        const { nodeVersion, npmVersion } = params;
        const generatedSnippets = (data.snippets as string[]).map((snippet) => composeJavascriptGeneratedSnippet({
          parser,
          filePattern,
          nodeVersion,
          npmVersion,
          snippet,
        }));
        return { generatedSnippets };
      }
    }
  } catch (error) {
    return { errorMessage: (error as Error).message };
  }
}
