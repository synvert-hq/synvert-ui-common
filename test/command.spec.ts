import fetchMock from 'jest-fetch-mock';

import {
  formatCommandResult,
  runSynvertRuby,
  runSynvertJavascript,
  DependencyResponse,
  checkRubyDependencies,
  checkJavascriptDependencies,
} from "../src/command";

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

describe("runSynvertRuby", () => {
  it("gets run command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(args).toEqual(["--execute", "run", "--format", "json", "--only-paths", "app,spec", "--skip-paths", "node_modules", "--double-quote", "--tab-width", "2", "."]);
      return { output: "", error: "" };
    };
    runSynvertRuby(runCommand, "run", ".", "app,spec", "node_modules", ["--double-quote", "--tab-width", "2"], "snippet code");
  });

  it("gets test command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(args).toEqual(["--execute", "test", "--only-paths", "app,spec", "--skip-paths", "node_modules", "--double-quote", "--tab-width", "2", "."]);
      return { output: "", error: "" };
    };
    runSynvertRuby(runCommand, "test", ".", "app,spec", "node_modules", ["--double-quote", "--tab-width", "2"], "snippet code");
  });
});

describe("runSynvertJavascript", () => {
  it("gets run command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(args).toEqual(["--execute", "run", "--format", "json", "--only-paths", "lib,spec", "--skip-paths", "node_modules", "--single-quote", "--no-semi", "--tab-width", "2", "--root-path", "."]);
      return { output: "", error: "" };
    };
    runSynvertJavascript(runCommand, "run", ".", "lib,spec", "node_modules", ["--single-quote", "--no-semi", "--tab-width", "2"], "snippet code");
  });

  it("gets test command args", () => {
    const runCommand = async (command: string, args: string[]) => {
      expect(args).toEqual(["--execute", "test", "--only-paths", "lib,spec", "--skip-paths", "node_modules", "--single-quote", "--no-semi", "--tab-width", "2", "--root-path", "."]);
      return { output: "", error: "" };
    };
    runSynvertJavascript(runCommand, "test", ".", "lib,spec", "node_modules", ["--single-quote", "--no-semi", "--tab-width", "2"], "snippet code");
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

  afterEach(() => {
    fetchMock.resetMocks();
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
