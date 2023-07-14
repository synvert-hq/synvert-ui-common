import dedent from "dedent";
import {
  placeholderByLanguage,
  parsersByLanguage,
  filterSnippets,
  sortSnippets,
  parseJSON,
  composeGeneratedSnippets,
  formatCommandResult,
} from "../src/index";

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

describe("filterSnippets", () => {
  it("gets snippets when text exists in group", () => {
    const snippets = [
      { id: 1, group: "group1", name: "name1", description: "description1", source_code: "" },
      { id: 2, group: "group2", name: "name2", description: "description2", source_code: "" },
    ];
    const text = "group1";
    expect(filterSnippets(snippets, text)).toEqual([snippets[0]]);
  });

  it("gets snippets when text exists in name", () => {
    const snippets = [
      { id: 1, group: "group1", name: "name1", description: "description1", source_code: "" },
      { id: 2, group: "group2", name: "name2", description: "description2", source_code: "" },
    ];
    const text = "name1";
    expect(filterSnippets(snippets, text)).toEqual([snippets[0]]);
  });

  it("gets snippets when text exists in description", () => {
    const snippets = [
      { id: 1, group: "group1", name: "name1", description: "description1", source_code: "" },
      { id: 2, group: "group2", name: "name2", description: "description2", source_code: "" },
    ];
    const text = "description1";
    expect(filterSnippets(snippets, text)).toEqual([snippets[0]]);
  });
});

describe("sortSnippets", () => {
  it("sorts snippets alphabetically, if text matches in group, sort first, if text matches in name, sort second", () => {
    const snippets = [
      { id: 1, group: "group ruby", name: "name rspec", description: "description rspec", source_code: "" },
      { id: 2, group: "group rails", name: "name rspec", description: "description ruby", source_code: "" },
      { id: 3, group: "group rspec", name: "name ruby", description: "description rails", source_code: "" },
      { id: 4, group: "group ruby", name: "name rails", description: "description rails", source_code: "" },
    ];
    const text = "ruby";
    sortSnippets(snippets, text);
    expect(snippets[0].id).toEqual(4);
    expect(snippets[1].id).toEqual(1);
    expect(snippets[2].id).toEqual(3);
    expect(snippets[3].id).toEqual(2);
  })
});

describe("parseJSON", () => {
  it("parses json with camel case keys", () => {
    const string = `{ "key": "value", "snake_case_key": "value", "camelCaseKey": "value" }`;
    expect(parseJSON(string)).toEqual({ key: "value", snakeCaseKey: "value", camelCaseKey: "value" });
  });
});

describe("composeGeneratedSnippet", () => {
  it("compose snippets for ruby", () => {
    const language = "ruby";
    const parser = "parser";
    const filePattern = "**/*.rb";
    const rubyVersion = "2.5.0";
    const gemVersion = "factory_girl >= 2.0.0";
    const snippets = [dedent`
      find_node '.const[name=FactoryGirl]' do
        replace :name, with: 'FactoryBot'
      end
    `];
    const composedSnippets = [dedent`
      Synvert::Rewriter.new 'group', 'name' do
        configure(parser: Synvert::PARSER_PARSER)
        if_ruby '2.5.0'
        if_gem 'factory_girl', '>= 2.0.0'
        within_files '**/*.rb' do
          find_node '.const[name=FactoryGirl]' do
            replace :name, with: 'FactoryBot'
          end
        end
      end
    `];
    expect(composeGeneratedSnippets({ language, parser, filePattern, rubyVersion, gemVersion, snippets })).toEqual(composedSnippets);
  });

  it("compose snippet for javascript", () => {
    const language = "javascript";
    const parser = "typescript";
    const filePattern = "**/*.js";
    const nodeVersion = "14.0.0";
    const npmVersion = "jquery >= 3.0.0";
    const snippets = [dedent`
      findNode(".CallExpression[callee=.MemberExpression[object IN ($ jQuery)][property=isArray]]", () => {
        replace("callee.object", { with: "Array" });
      });
    `];
    const composedSnippets = [dedent`
      new Synvert.Rewriter("group", "name", () => {
        configure({ parser: Synvert.Parser.TYPESCRIPT });
        ifNode("14.0.0");
        ifNpm("jquery", ">= 3.0.0");
        withinFiles("**/*.js", () => {
          findNode(".CallExpression[callee=.MemberExpression[object IN ($ jQuery)][property=isArray]]", () => {
            replace("callee.object", { with: "Array" });
          });
        });
      });
    `];
    expect(composeGeneratedSnippets({ language, parser, filePattern, nodeVersion, npmVersion, snippets })).toEqual(composedSnippets);
  });
});

describe("formatCommandResult", () => {
  it("formats with empty stderr", () => {
    expect(formatCommandResult({ stdout: "hello world", stderr: "" })).toEqual({ output: "hello world", error: undefined });
  });

  it("formats with stderr", () => {
    expect(formatCommandResult({ stdout: "", stderr: "hello world" })).toEqual({ output: "", error: "hello world" });
  });

  it("formats with warning", () => {
    expect(formatCommandResult({ stdout: "hello world", stderr: "warning: hello world" })).toEqual({ output: "hello world", error: undefined });
  });
});