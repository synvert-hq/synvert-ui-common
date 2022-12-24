export interface Snippet {
  readonly id: number;
  readonly group: string;
  readonly name: string;
  readonly description?: string;
  readonly source_code: string;
}

/**
 * Check if a snippet matches by the text.
 * @param {Snippet} snippet
 * @param {string} text
 * @returns {boolean} true if matches
 */
export function snippetMatchesByText(snippet: Snippet, text: string): boolean {
  const lowerCaseText = text.toLowerCase();
  return (
    snippet.group.toLowerCase().includes(lowerCaseText) ||
    snippet.name.toLowerCase().includes(lowerCaseText) ||
    (!!snippet.description && snippet.description.toLowerCase().includes(lowerCaseText))
  );
}