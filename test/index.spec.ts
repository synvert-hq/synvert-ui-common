import dedent from "dedent";
import { filterSnippets, sortSnippets, composeRubyGeneratedSnippet, composeJavascriptGeneratedSnippet } from "../src/index";

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

describe("composeRubyGeneratedSnippet", () => {
  it("compose snippet for ruby", () => {
    const filePattern = '**/*.rb';
    const rubyVersion = '2.5.0';
    const gemVersion = 'factory_girl >= 2.0.0';
    const snippet = dedent`
      find_node '.const[name=FactoryGirl]' do
        replace :name, with: 'FactoryBot'
      end
    `;
    const composedSnippet = dedent`
      Synvert::Rewriter.new 'group', 'name' do
        if_ruby '2.5.0'
        if_gem 'factory_girl', '>= 2.0.0'
        within_files '**/*.rb' do
          find_node '.const[name=FactoryGirl]' do
            replace :name, with: 'FactoryBot'
          end
        end
      end
    `;
    expect(composeRubyGeneratedSnippet({ filePattern, rubyVersion, gemVersion, snippet })).toEqual(composedSnippet);
  });
});

describe("composeJavascriptGeneratedSnippet", () => {
  it("compose snippet for javascript", () => {
    const filePattern = '**/*.js';
    const nodeVersion = '14.0.0';
    const npmVersion = 'jquery >= 3.0.0';
    const snippet = dedent`
      findNode(".CallExpression[callee=.MemberExpression[object IN ($ jQuery)][property=isArray]]", () => {
        replace("callee.object", { with: "Array" });
      });
    `;
    const composedSnippet = dedent`
      const Synvert = require("synvert-core");

      new Synvert.Rewriter("group", "name", () => {
        ifNode("14.0.0");
        ifNpm("jquery", ">= 3.0.0");
        withinFiles("**/*.js", () => {
          findNode(".CallExpression[callee=.MemberExpression[object IN ($ jQuery)][property=isArray]]", () => {
            replace("callee.object", { with: "Array" });
          });
        });
      });
    `;
    expect(composeJavascriptGeneratedSnippet({ filePattern, nodeVersion, npmVersion, snippet })).toEqual(composedSnippet);
  });
});