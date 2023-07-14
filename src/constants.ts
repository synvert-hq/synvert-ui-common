export const PLACEHODERS: { [language: string]: { [name: string]: string } } = {
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
  lss: {
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