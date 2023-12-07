import { replaceTestResult, replaceTestAction } from '../src/action';

describe("replaceTestResult", () => {
  it("replaces the result", () => {
    const results = [{
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
    }];
    const source = replaceTestResult(results, 0, "hello world");
    expect(source).toEqual("hi--foo");
  });
});

describe("replaceResultAction", () => {
  it("replaces only result and action", () => {
    const results = [{
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
    }];
    const source = replaceTestAction(results, 0, 0, "hello world");
    expect(source).toEqual("hi world");
    expect(results.length).toEqual(0);
  });

  it("replaces the action", () => {
    const results = [{
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
    }];
    const source = replaceTestAction(results, 0, 0, "hello world");
    expect(source).toEqual("hi world");
    expect(results.length).toEqual(1);
    expect(results[0].actions.length).toEqual(1);
    expect(results[0].actions[0]).toEqual({
      type: "replace",
      start: 3,
      end: 8,
      newCode: "foo"
    });
  });

  it("replaces the action when result contains group action", () => {
    const results = [{
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
    }];
    const source = replaceTestAction(results, 0, 0, "hello world");
    expect(source).toEqual("hello--world");
    expect(results.length).toEqual(1);
    expect(results[0].actions.length).toEqual(1);
    expect(results[0].actions[0]).toEqual({
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
    const results = [{
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
    }];
    const source = replaceTestAction(results, 0, 1, "hello world");
    expect(source).toEqual("hi foo");
    expect(results.length).toEqual(1);
    expect(results[0].actions.length).toEqual(1);
    expect(results[0].actions[0]).toEqual({
      type: "replace",
      start: 2,
      end: 3,
      newCode: "--"
    });
  });
});