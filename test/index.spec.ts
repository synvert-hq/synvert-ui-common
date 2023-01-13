import dedent from "dedent";
import { composeRubyGeneratedSnippet, composeJavascriptGeneratedSnippet } from "../src/index";

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