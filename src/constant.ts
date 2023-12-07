export const FILE_PATTERNS: { [language:string]: string } = {
  ruby: "**/*.rb",
  javascript: "**/*.js",
  typescript: "**/*.ts",
  css: "**/*.css",
  less: "**/*.less",
  sass: "**/*.sass",
  scss: "**/*.scss",
};

export const PLACEHOLDERS: { [language: string]: { [name: string]: string } } = {
  ruby: {
    input: "FactoryBot.create(:user)",
    output: "create(:user)",
  },
  javascript: {
    input: "foo.substring(indexStart, indexEnd)",
    output: "foo.slice(indexStart, indexEnd)",
  },
  typescript: {
    input: "const x: Array<string> = ['a', 'b']",
    output: "const x: string[] = ['a', 'b']",
  },
  css: {
    input: "",
    output: "",
  },
  less: {
    input: "",
    output: "",
  },
  sass: {
    input: "",
    output: "",
  },
  scss: {
    input: "",
    output: "",
  },
}

export const PARSERS: { [language: string]: string[] } = {
  ruby: ["parser", "syntax_tree"],
  javascript: ["typescript", "espree"],
  typescript: ["typescript"],
  css: ["gonzales-pe"],
  less: ["gonzales-pe"],
  sass: ["gonzales-pe"],
  scss: ["gonzales-pe"],
}
