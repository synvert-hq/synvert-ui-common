import {
  filePatternByLanguage,
  placeholderByLanguage,
  parsersByLanguage,
  parseJSON,
} from "../src/index";

describe("filePatternByLanguage", () => {
  it("gets file pattern for ruby", () => {
    expect(filePatternByLanguage("ruby")).toEqual("**/*.rb");
  });

  it("gets file pattern for javascript", () => {
    expect(filePatternByLanguage("javascript")).toEqual("**/*.js");
  });
});

describe("placeholderByLanguage", () => {
  it("gets placeholders for ruby", () => {
    expect(placeholderByLanguage("ruby")).toEqual({
      input: "FactoryBot.create(:user)",
      output: "create(:user)",
    });
  });

  it("gets placeholders for javascript", () => {
    expect(placeholderByLanguage("javascript")).toEqual({
      input: "foo.substring(indexStart, indexEnd)",
      output: "foo.slice(indexStart, indexEnd)",
    });
  });
});

describe("parsersByLanguage", () => {
  it("gets parsers for ruby", () => {
    expect(parsersByLanguage("ruby")).toEqual(["parser", "syntax_tree"]);
  });

  it("gets parsers for javascript", () => {
    expect(parsersByLanguage("javascript")).toEqual(["typescript", "espree"]);
  });
});

describe("parseJSON", () => {
  it("parses json with camel case keys", () => {
    const string = `{ "key": "value", "snake_case_key": "value", "camelCaseKey": "value" }`;
    expect(parseJSON(string)).toEqual({ key: "value", snakeCaseKey: "value", camelCaseKey: "value" });
  });
});
