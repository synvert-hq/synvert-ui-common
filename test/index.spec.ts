import dedent from "dedent";
import fetchMock from 'jest-fetch-mock';

import {
  filePatternByLanguage,
  placeholderByLanguage,
  parsersByLanguage,
  filterSnippets,
  sortSnippets,
  parseJSON,
  composeGeneratedSnippets,
  formatCommandResult,
  buildRubyCommandArgs,
  buildJavascriptCommandArgs,
  DependencyResponse,
  checkRubyDependencies,
  checkJavascriptDependencies,
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

describe("buildRubyCommandArgs", () => {
  it("gets run command args", () => {
    const commandArgs = buildRubyCommandArgs("run", ".", "app,spec", "node_modules", ["--double-quote", "--tab-width", "2"]);
    expect(commandArgs).toEqual(["--execute", "run", "--format", "json", "--only-paths", "app,spec", "--skip-paths", "node_modules", "--double-quote", "--tab-width", "2", "."]);
  });

  it("gets test command args", () => {
    const commandArgs = buildRubyCommandArgs("test", ".", "app,spec", "node_modules", ["--double-quote", "--tab-width", "2"]);
    expect(commandArgs).toEqual(["--execute", "test", "--only-paths", "app,spec", "--skip-paths", "node_modules", "--double-quote", "--tab-width", "2", "."]);
  });
});

describe("buildJavascriptCommandArgs", () => {
  it("gets run command args", () => {
    const commandArgs = buildJavascriptCommandArgs("run", ".", "lib,spec", "node_modules", ["--single-quote", "--no-semi", "--tab-width", "2"]);
    expect(commandArgs).toEqual(["--execute", "run", "--format", "json", "--only-paths", "lib,spec", "--skip-paths", "node_modules", "--single-quote", "--no-semi", "--tab-width", "2", "--root-path", "."]);
  });

  it("gets test command args", () => {
    const commandArgs = buildJavascriptCommandArgs("test", ".", "lib,spec", "node_modules", ["--single-quote", "--no-semi", "--tab-width", "2"]);
    expect(commandArgs).toEqual(["--execute", "test", "--only-paths", "lib,spec", "--skip-paths", "node_modules", "--single-quote", "--no-semi", "--tab-width", "2", "--root-path", "."]);
  });
});

describe("checkRubyDependencies", () => {
  beforeEach(() => {
    fetchMock.mockIf("https://api-ruby.synvert.net/check-versions", JSON.stringify({ synvert_version: "2.0.0", synvert_core_version: "3.0.0" }));
  });

  it("returns RUBY_NOT_AVAILABLE if ruby command returns an error", async () => {
    const runCommand = async () => ({ output: "", error: "ruby command not found" });
    const result = await checkRubyDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.RUBY_NOT_AVAILABLE);
  });

  it("returns SYNVERT_NOT_AVAILABLE if synvert-ruby command returns an error", async () => {
    const runCommand = async (command: string, args: string[]) => {
      if (command === "ruby" && args[0] === "-v") {
        return { output: "ruby 2.7.0", error: "" };
      } else if (command === "synvert-ruby" && args[0] === "-v") {
        return { output: "", error: "synvert-ruby command not found" };
      }
      return { output: "", error: "" };
    };
    const result = await checkRubyDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.SYNVERT_NOT_AVAILABLE);
  });

  it("returns SYNVERT_OUTDATED if local synvert version is outdated", async () => {
    const runCommand = async (command: string, args: string[]) => {
      if (command === "ruby" && args[0] === "-v") {
        return { output: "ruby 2.7.0", error: "" };
      } else if (command === "synvert-ruby" && args[0] === "-v") {
        return { output: "1.0.0 (with synvert-core 2.0.0)", error: "" };
      }
      return { output: "", error: "" };
    };
    const result = await checkRubyDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.SYNVERT_OUTDATED);
    expect(result.remoteSynvertVersion).toEqual("2.0.0");
    expect(result.localSynvertVersion).toEqual("1.0.0");
  });

  it("returns SYNVERT_CORE_OUTDATED if local synvert core version is outdated", async () => {
    const runCommand = async (command: string, args: string[]) => {
      if (command === "ruby" && args[0] === "-v") {
        return { output: "ruby 2.7.0", error: "" };
      } else if (command === "synvert-ruby" && args[0] === "-v") {
        return { output: "2.0.0 (with synvert-core 2.0.0)", error: "" };
      }
      return { output: "", error: "" };
    };
    const result = await checkRubyDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.SYNVERT_CORE_OUTDATED);
    expect(result.remoteSynvertCoreVersion).toEqual("3.0.0");
    expect(result.localSynvertCoreVersion).toEqual("2.0.0");
  });

  it("returns OK if all dependencies are up to date", async () => {
    const runCommand = async (command: string, args: string[]) => {
      if (command === "ruby" && args[0] === "-v") {
        return { output: "ruby 2.7.0", error: "" };
      } else if (command === "synvert-ruby" && args[0] === "-v") {
        return { output: "2.0.0 (with synvert-core 3.0.0)", error: "" };
      }
      return { output: "", error: "" };
    };
    const result = await checkRubyDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.OK);
  });

  it("returns ERROR if an error occurs during the dependency check", async () => {
    const runCommand = async () => {
      throw new Error("An error occurred");
    };
    const result = await checkRubyDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.ERROR);
    expect(result.error).toEqual("An error occurred");
  });
});

describe("checkJavascriptDependencies", () => {
  beforeEach(() => {
    fetchMock.mockIf("https://api-javascript.synvert.net/check-versions", JSON.stringify({ synvert_version: "2.0.0", synvert_core_version: "3.0.0" }));
  });

  it("returns JAVASCRIPT_NOT_AVAILABLE if node command returns an error", async () => {
    const runCommand = async () => ({ output: "", error: "node command not found" });
    const result = await checkJavascriptDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.JAVASCRIPT_NOT_AVAILABLE);
  });

  it("returns SYNVERT_NOT_AVAILABLE if synvert-javascript command returns an error", async () => {
    const runCommand = async (command: string, args: string[]) => {
      if (command === "node" && args[0] === "-v") {
        return { output: "node 20.0.0", error: "" };
      } else if (command === "synvert-javascript" && args[0] === "-v") {
        return { output: "", error: "synvert-javascript command not found" };
      }
      return { output: "", error: "" };
    };
    const result = await checkJavascriptDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.SYNVERT_NOT_AVAILABLE);
  });

  it("returns SYNVERT_OUTDATED if local synvert version is outdated", async () => {
    const runCommand = async (command: string, args: string[]) => {
      if (command === "node" && args[0] === "-v") {
        return { output: "node 20.0.0", error: "" };
      } else if (command === "synvert-javascript" && args[0] === "-v") {
        return { output: "1.0.0 (with synvert-core 2.0.0)", error: "" };
      }
      return { output: "", error: "" };
    };
    const result = await checkJavascriptDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.SYNVERT_OUTDATED);
    expect(result.remoteSynvertVersion).toEqual("2.0.0");
    expect(result.localSynvertVersion).toEqual("1.0.0");
  });

  it("returns OK if all dependencies are up to date", async () => {
    const runCommand = async (command: string, args: string[]) => {
      if (command === "node" && args[0] === "-v") {
        return { output: "node 20.0.0", error: "" };
      } else if (command === "synvert-javascript" && args[0] === "-v") {
        return { output: "2.0.0 (with synvert-core 3.0.0)", error: "" };
      }
      return { output: "", error: "" };
    };
    const result = await checkJavascriptDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.OK);
  });

  it("returns ERROR if an error occurs during the dependency check", async () => {
    const runCommand = async () => {
      throw new Error("An error occurred");
    };
    const result = await checkJavascriptDependencies(runCommand);
    expect(result.code).toEqual(DependencyResponse.ERROR);
    expect(result.error).toEqual("An error occurred");
  });
});
