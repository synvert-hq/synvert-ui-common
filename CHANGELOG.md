# CHANGELOG

## 1.15.2 (2024-02-16)

* Send `parser` in /generate-snippet request

## 1.15.1 (2024-02-16)

* `nqlOrRules` is a string "rules" or "nql"
* `language` is type LANGUAGE
* Export type `LANGUAGE` and `GenerateSnippetsParams`

## 1.15.0 (2024-02-16)

* Add `prism` parser

## 1.14.2 (2024-01-26)

* Strip `Resolving dependencies...\n` from command output

## 1.14.1 (2023-12-27)

* Read `rootPath` from test result

## 1.14.0 (2023-12-26)

* `replaceTestResult` and `replaceTestAction` can write file
* Add `replaceAllTestResults` function
* Add `removeTestAction` and `removeTestResult` functions
* Export `getNewSourceByTestResult` function

## 1.13.0 (2023-12-24)

* Add `handleTestResults` function

## 1.12.3 (2023-12-24)

* `replaceTestResult` and `replaceTestAction` result can be undefined

## 1.12.2 (2023-12-23)

* `replaceTestResult` and `replaceTestAction` argument `source` can be undefined

## 1.12.1 (2023-12-11)

* Pass `language` query string to GET /snippets

## 1.12.0 (2023-12-10)

* Add `fetchSnippets` function
* Add `generateSnippets` function

## 1.11.1 (2023-12-10)

* `DependencyResponse` is not a type

## 1.11.0 (2023-12-09)

* Extract `command` functions
* Extract `snippet` functions
* Add `replaceTestResult` and `replaceTestAction` functions

## 1.10.0 (2023-11-24)

* Add `checkRubyDependencies` and `checkJavascriptDependencies` functions

## 1.9.2 (2023-11-23)

* Make `additionalArgs` an array of strings

## 1.9.1 (2023-11-23)

* Make `input` and `error` optional type

## 1.9.0 (2023-11-22)

* Add `runSynvertRuby` and `runSynvertJavascript` functions

## 1.8.1 (2023-10-05)

* Handle more cases in `isRealError`

## 1.8.0 (2023-07-14)

* Add `filePatternByLanguage` function

## 1.7.1 (2023-07-14)

* Export type `Snippet`

## 1.7.0 (2023-07-14)

* Add `placeholderByLanguage` function
* Add `parsersByLanguage` function

## 1.6.3 (2023-07-04)

* Fix ruby configuration parser

## 1.6.2 (2023-07-03)

* Support `css` language in GenerateSnippetParams

## 1.6.1 (2023/06/10)

* Add `parser` to `composeGeneratedSnippets`

## 1.6.0 (2023/02/21)

* Add `composeGeneratedSnippets` function

## 1.5.1 (2023/02/20)

* No need to generate `const Synvert = require("synvert-core");`

## 1.5.0 (2023/02/04)

* Add `formatCommandResult` function

## 1.4.1 (2023/02/04)

* Revert "Add `runShellCommand` function"

## 1.4.0 (2023/02/04)

* Add `parseJSON` function
* Add `runShellCommand` function

## 1.3.0 (2023/01/14)

* Add `composeRubyGeneratedSnippet` and `composeJavascriptGeneratedSnippet` functions

## 1.2.0 (2022/12/24)

* Add `filterSnippets` function

## 1.1.0 (2022/12/24)

* Add `sortSnippets` function
