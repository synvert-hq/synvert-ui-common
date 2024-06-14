import dedent from "dedent";

import {
  filterSnippets,
  sortSnippets,
  fetchSnippets,
  generateSnippets,
} from "../src/snippet";

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

describe("fetchSnippets", () => {
  describe("javascript", () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ snippets: [
            { group: "group1", name: "name1", description: "description1", source_code: "" },
            { group: "group2", name: "name2", description: "description2", source_code: "" },
          ] }),
        }),
      ) as jest.Mock;
    });

    it("fetches snippets", async () => {
      const data = await fetchSnippets("javascript", "token", "platform");
      expect(data.snippets).toEqual([
        { id: "group1/name1", group: "group1", name: "name1", description: "description1", source_code: "" },
        { id: "group2/name2", group: "group2", name: "name2", description: "description2", source_code: "" },
      ]);
    });
  });

  describe("ruby", () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ snippets: [
            { group: "group1", name: "name1", description: "description1", source_code: "" },
            { group: "group2", name: "name2", description: "description2", source_code: "" },
          ] }),
        }),
      ) as jest.Mock;
    });

    it("fetches snippets", async () => {
      const data = await fetchSnippets("ruby", "token", "platform");
      expect(data.snippets).toEqual([
        { id: "group1/name1", group: "group1", name: "name1", description: "description1", source_code: "" },
        { id: "group2/name2", group: "group2", name: "name2", description: "description2", source_code: "" },
      ]);
    });
  });

  describe("error", () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve(""),
        }),
      ) as jest.Mock;
    });

    it("gets error", async () => {
      const data = await fetchSnippets("ruby", "token", "platform");
      expect(data.errorMessage).toEqual("Cannot read properties of undefined (reading 'map')");
    });
  });
});

describe("generateSnippets", () => {
  describe("javascript", () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ snippets: [dedent`
            findNode(".CallExpression[callee=.MemberExpression[object IN ($ jQuery)][property=isArray]]", () => {
              replace("callee.object", { with: "Array" });
            });
          `] }),
        }),
      ) as jest.Mock;
    });

    it("generates snippet", async () => {
      const { generatedSnippets } = await generateSnippets("token", "platform", { language: "javascript", parser: "typescript", filePattern: "**/*.js", nodeVersion: "14.0.0", npmVersion: "jquery >= 3.0.0", inputs: ["input"], outputs: ["output"], nqlOrRules: "nql" });
      expect(generatedSnippets).toEqual([dedent`
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
      `]);
    });
  });

  describe("ruby", () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ snippets: [dedent`
            find_node '.const[name=FactoryGirl]' do
              replace :name, with: 'FactoryBot'
            end
          `] }),
        }),
      ) as jest.Mock;
    });

    it("generates snippet", async () => {
      const { generatedSnippets } = await generateSnippets("token", "platform", { language: "ruby", parser: "parser", filePattern: "**/*.rb", rubyVersion: "2.5.0", gemVersion: "factory_girl >= 2.0.0", inputs: ["input"], outputs: ["output"], nqlOrRules: "nql" });
      expect(generatedSnippets).toEqual([dedent`
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
      `]);
    });
  });
});
