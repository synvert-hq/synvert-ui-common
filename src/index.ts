export interface Snippet {
  readonly id: number;
  readonly group: string;
  readonly name: string;
  readonly description?: string;
  readonly source_code: string;
}

/**
 * Filter snippets select option.
 * @param {Snippet} snippet - value of an option
 * @param {string} inputValue - input value
 * @returns {boolean} if snippet matches an input value
 */
export function filterOption(snippet: Snippet, inputValue: string): boolean {
  const text = inputValue.toLowerCase();
  return (
    snippet.group.toLowerCase().includes(text) ||
    snippet.name.toLowerCase().includes(text) ||
    (!!snippet.description && snippet.description.toLowerCase().includes(text))
  );
}