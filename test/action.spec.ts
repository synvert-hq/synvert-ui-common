import { replaceTestResult, replaceTestAction } from '../src/action';

describe("replaceTestResult", () => {
  it("replaces the result", () => {
    const result = {
      rootPath: "/root",
      fileSource: "hello world",
      filePath: "foo.ts",
      affected: true,
      conflicted: false,
      actions: [{
        type: "replace",
        start: 5,
        end: 6,
        newCode: "--"
      }, {
        type: "group",
        start: 0,
        end: 11,
        actions: [{
          type: "replace",
          start: 0,
          end: 5,
          newCode: "hi"
        }, {
          type: "replace",
          start: 6,
          end: 11,
          newCode: "foo"
        }]
      }]
    };
    const source = replaceTestResult(result, "hello world");
    expect(source).toEqual("hi--foo");
  });

  it("replaces the result if source is undefined", () => {
    const result = {
      rootPath: "/root",
      fileSource: "hello world",
      filePath: "foo.ts",
      affected: true,
      conflicted: false,
      actions: [{
        type: "add_file",
        start: 0,
        end: 0,
        newCode: "class ApplicationRecord; end"
      }]
    }
    const source = replaceTestResult(result, undefined);
    expect(source).toEqual("class ApplicationRecord; end");
  });
});

describe("replaceResultAction", () => {
  it("replaces only result and action", () => {
    const result = {
      rootPath: "/root",
      fileSource: "hello world",
      filePath: "foo.ts",
      affected: true,
      conflicted: false,
      actions: [{
        type: "replace",
        start: 0,
        end: 5,
        newCode: "hi"
      }]
    };
    const source = replaceTestAction(result, result.actions[0], "hello world");
    expect(source).toEqual("hi world");
  });

  it("replaces the action", () => {
    const result = {
      rootPath: "/root",
      fileSource: "hello world",
      filePath: "foo.ts",
      affected: true,
      conflicted: false,
      actions: [{
        type: "replace",
        start: 0,
        end: 5,
        newCode: "hi"
      }, {
        type: "replace",
        start: 6,
        end: 11,
        newCode: "foo"
      }]
    };
    const source = replaceTestAction(result, result.actions[0], "hello world");
    expect(source).toEqual("hi world");
    expect(result.actions[1]).toEqual({
      type: "replace",
      start: 3,
      end: 8,
      newCode: "foo"
    });
  });

  it("replaces the action when result contains group action", () => {
    const result = {
      rootPath: "/root",
      fileSource: "hello world",
      filePath: "foo.ts",
      affected: true,
      conflicted: false,
      actions: [{
        type: "replace",
        start: 5,
        end: 6,
        newCode: "--"
      }, {
        type: "group",
        start: 0,
        end: 11,
        actions: [{
          type: "replace",
          start: 0,
          end: 5,
          newCode: "hi"
        }, {
          type: "replace",
          start: 6,
          end: 11,
          newCode: "foo"
        }]
      }]
    };
    const source = replaceTestAction(result, result.actions[0], "hello world");
    expect(source).toEqual("hello--world");
    expect(result.actions[1]).toEqual({
      type: "group",
      start: 0,
      end: 12,
      actions: [{
        type: "replace",
        start: 0,
        end: 5,
        newCode: "hi"
      }, {
        type: "replace",
        start: 7,
        end: 12,
        newCode: "foo"
      }]
    });
  });

  it("replaces the group action", () => {
    const result = {
      rootPath: "/root",
      fileSource: "hello world",
      filePath: "foo.ts",
      affected: true,
      conflicted: false,
      actions: [{
        type: "replace",
        start: 5,
        end: 6,
        newCode: "--"
      }, {
        type: "group",
        start: 0,
        end: 11,
        actions: [{
          type: "replace",
          start: 0,
          end: 5,
          newCode: "hi"
        }, {
          type: "replace",
          start: 6,
          end: 11,
          newCode: "foo"
        }]
      }]
    };
    const source = replaceTestAction(result, result.actions[1], "hello world");
    expect(source).toEqual("hi foo");
    expect(result.actions[0]).toEqual({
      type: "replace",
      start: 2,
      end: 3,
      newCode: "--"
    });
  });

  it("replaces the action if source is undefined", () => {
    const result = {
      rootPath: "/root",
      fileSource: "hello world",
      filePath: "foo.ts",
      affected: true,
      conflicted: false,
      actions: [{
        type: "add_file",
        start: 0,
        end: 0,
        newCode: "class ApplicationRecord; end"
      }]
    }
    const source = replaceTestAction(result, result.actions[0], undefined);
    expect(source).toEqual("class ApplicationRecord; end");
  });
});