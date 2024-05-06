import path from "path";
import promiseFs from "fs/promises";
import fetchMock from 'jest-fetch-mock';
import mock from "mock-fs";

import {
  formatCommandResult,
  runSynvertRuby,
  runSynvertJavascript,
  DependencyResponse,
  checkRubyDependencies,
  checkJavascriptDependencies,
  installGem,
  installNpm,
  parseJSON,
  handleTestResults,
} from "../src/command";

describe("formatCommandResult", () => {
  it("formats with empty stderr", () => {
    expect(formatCommandResult({ output: "hello world" })).toEqual({ output: "hello world", error: undefined });
  });

  it("formats with stderr", () => {
    expect(formatCommandResult({ output: "", error: "hello world" })).toEqual({ output: "", error: "hello world" });
  });

  it("formats with warning", () => {
    expect(formatCommandResult({ output: "hello world", error: "warning: hello world" })).toEqual({ output: "hello world", error: undefined });
  });

  it("formats output", () => {
    expect(formatCommandResult({ output: "Resolving dependencies...\nhello world", error: "" })).toEqual({ output: "hello world", error: undefined });
  });
});

describe("runSynvertRuby", () => {
  it("gets run command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(command).toEqual("synvert-ruby");
      expect(args).toEqual(["--execute", "run", "--format", "json", "--only-paths", "app,spec", "--skip-paths", "node_modules", "--double-quote", "--tab-width", "2", "."]);
      return { output: "", error: "" };
    };
    runSynvertRuby({
      runCommand,
      executeCommand: "run",
      rootPath: ".",
      onlyPaths: "app,spec",
      skipPaths: "node_modules",
      additionalArgs: ["--double-quote", "--tab-width", "2"],
      snippetCode: "snippet code",
    });
  });

  it("gets test command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(command).toEqual("/bin/synvert-ruby");
      expect(args).toEqual(["--execute", "test", "--only-paths", "app,spec", "--skip-paths", "node_modules", "--double-quote", "--tab-width", "2", "."]);
      return { output: "", error: "" };
    };
    runSynvertRuby({
      runCommand,
      executeCommand: "test",
      rootPath: ".",
      onlyPaths: "app,spec",
      skipPaths: "node_modules",
      additionalArgs: ["--double-quote", "--tab-width", "2"],
      snippetCode: "snippet code",
      binPath: "/bin",
    });
  });
});

describe("runSynvertJavascript", () => {
  it("gets run command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(command).toEqual("synvert-javascript");
      expect(args).toEqual(["--execute", "run", "--format", "json", "--only-paths", "lib,spec", "--skip-paths", "node_modules", "--single-quote", "--no-semi", "--tab-width", "2", "--root-path", "."]);
      return { output: "", error: "" };
    };
    runSynvertJavascript({
      runCommand,
      executeCommand: "run",
      rootPath: ".",
      onlyPaths: "lib,spec",
      skipPaths: "node_modules",
      additionalArgs: ["--single-quote", "--no-semi", "--tab-width", "2"],
      snippetCode: "snippet code",
    });
  });

  it("gets test command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(command).toEqual("/bin/synvert-javascript");
      expect(args).toEqual(["--execute", "test", "--only-paths", "lib,spec", "--skip-paths", "node_modules", "--single-quote", "--no-semi", "--tab-width", "2", "--root-path", "."]);
      return { output: "", error: "" };
    };
    runSynvertJavascript({
      runCommand,
      executeCommand: "test",
      rootPath: ".",
      onlyPaths: "lib,spec",
      skipPaths: "node_modules",
      additionalArgs: ["--single-quote", "--no-semi", "--tab-width", "2"],
      snippetCode: "snippet code",
      binPath: "/bin",
    });
  });
});

describe("checkRubyDependencies", () => {
  beforeEach(() => {
    fetchMock.mockIf("https://api-ruby.synvert.net/check-versions", JSON.stringify({ synvert_version: "2.0.0", synvert_core_version: "3.0.0" }));
  });

  afterEach(() => {
    fetchMock.resetMocks();
  });

  it("returns RUBY_NOT_AVAILABLE if ruby command returns an error", async () => {
    const runCommand = async () => ({ output: "", error: "ruby command not found" });
    const result = await checkRubyDependencies({ runCommand });
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
    const result = await checkRubyDependencies({ runCommand });
    expect(result.code).toEqual(DependencyResponse.SYNVERT_NOT_AVAILABLE);
  });

  it("returns SYNVERT_NOT_AVAILABLE if /bin/synvert-ruby command returns an error", async () => {
    const runCommand = async (command: string, args: string[]) => {
      if (command === "ruby" && args[0] === "-v") {
        return { output: "ruby 2.7.0", error: "" };
      } else if (command === "/bin/synvert-ruby" && args[0] === "-v") {
        return { output: "", error: "synvert-ruby command not found" };
      }
      return { output: "", error: "" };
    };
    const result = await checkRubyDependencies({ runCommand, binPath: "/bin" });
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
    const result = await checkRubyDependencies({ runCommand });
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
    const result = await checkRubyDependencies({ runCommand });
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
    const result = await checkRubyDependencies({ runCommand });
    expect(result.code).toEqual(DependencyResponse.OK);
  });

  it("returns ERROR if an error occurs during the dependency check", async () => {
    const runCommand = async () => {
      throw new Error("An error occurred");
    };
    const result = await checkRubyDependencies({ runCommand });
    expect(result.code).toEqual(DependencyResponse.ERROR);
    expect(result.error).toEqual("An error occurred");
  });
});

describe("checkJavascriptDependencies", () => {
  beforeEach(() => {
    fetchMock.mockIf("https://api-javascript.synvert.net/check-versions", JSON.stringify({ synvert_version: "2.0.0", synvert_core_version: "3.0.0" }));
  });

  afterEach(() => {
    fetchMock.resetMocks();
  });

  it("returns JAVASCRIPT_NOT_AVAILABLE if node command returns an error", async () => {
    const runCommand = async () => ({ output: "", error: "node command not found" });
    const result = await checkJavascriptDependencies({ runCommand });
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
    const result = await checkJavascriptDependencies({ runCommand });
    expect(result.code).toEqual(DependencyResponse.SYNVERT_NOT_AVAILABLE);
  });

  it("returns SYNVERT_NOT_AVAILABLE if /bin/synvert-javascript command returns an error", async () => {
    const runCommand = async (command: string, args: string[]) => {
      if (command === "node" && args[0] === "-v") {
        return { output: "node 20.0.0", error: "" };
      } else if (command === "/bin/synvert-javascript" && args[0] === "-v") {
        return { output: "", error: "synvert-javascript command not found" };
      }
      return { output: "", error: "" };
    };
    const result = await checkJavascriptDependencies({ runCommand, binPath: "/bin" });
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
    const result = await checkJavascriptDependencies({ runCommand });
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
    const result = await checkJavascriptDependencies({ runCommand });
    expect(result.code).toEqual(DependencyResponse.OK);
  });

  it("returns ERROR if an error occurs during the dependency check", async () => {
    const runCommand = async () => {
      throw new Error("An error occurred");
    };
    const result = await checkJavascriptDependencies({ runCommand });
    expect(result.code).toEqual(DependencyResponse.ERROR);
    expect(result.error).toEqual("An error occurred");
  });
});

describe("installGem", () => {
  it("gets run command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(command).toEqual("/bin/gem");
      expect(args).toEqual(["install", "synvert-core", "synvert"]);
      return { output: "", error: "" };
    };
    installGem({
      runCommand,
      gemName: ["synvert-core", "synvert"],
      binPath: "/bin",
    });
  });
});

describe("installNpm", () => {
  it("gets run command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(command).toEqual("/bin/npm");
      expect(args).toEqual(["install", "-g", "synvert"]);
      return { output: "", error: "" };
    };
    installNpm({
      runCommand,
      npmName: "synvert",
      binPath: "/bin",
    });
  });
});

describe("syncRubySnippets", () => {
  it("gets run command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(command).toEqual("synvert-ruby");
      expect(args).toEqual(["--sync"]);
      return { output: "", error: "" };
    };
    syncRubySnippets({
      runCommand,
    });
  });
});

describe("parseJSON", () => {
  it("parses json with camel case keys", () => {
    const string = `{ "key": "value", "snake_case_key": "value", "camelCaseKey": "value" }`;
    expect(parseJSON(string)).toEqual({ key: "value", snakeCaseKey: "value", camelCaseKey: "value" });
  });
});

describe("handleTestResults", () => {
  afterEach(() => {
    mock.restore();
  });

  it("handles test results", async () => {
    const result = {
      rootPath: "/root",
      filePath: "foo.ts",
      newFilePath: "bar.ts",
      affected: true,
      conflicted: false,
      actions: [{
        type: "rename_file",
        start: 0,
        end: -1,
      }]
    };
    const result2 = {
      rootPath: "/root",
      filePath: "foo.ts",
      affected: true,
      conflicted: false,
      actions: [{
        type: "replace",
        start: 6,
        end: -1,
        newCode: "synvert"
      }]
    };
    mock({ "/root/foo.ts": "hello world" });
    const results = await handleTestResults(JSON.stringify([result, result2]), undefined, "/root", path, promiseFs);
    expect(results).toEqual({
      errorMessage: "",
      results: [{
        actions: [{
          end: -1,
          start: 0,
          type: "rename_file"
        }, {
          end: -1,
          newCode: "synvert",
          start: 6,
          type: "replace"
        }],
        affected: true,
        conflicted: false,
        filePath: "foo.ts",
        fileSource: "hello world",
        newFilePath: "bar.ts",
        rootPath: "/root"
      }]
    });
  });
});
