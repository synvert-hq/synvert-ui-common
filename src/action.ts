import { TestResultExtExt, Action, PathAPI, PromiseFsAPI } from "./types";

function flatActions(actions: Action[]): Action[] {
  const flattenActions: Action[] = [];
  actions.forEach(action => {
    if (action.type === "group") {
      flattenActions.push(...flatActions(action.actions!));
    } else {
      flattenActions.push(action);
    }
  });
  return flattenActions;
}

function sortFlattenActions(flattenActions: Action[]): Action[] {
  return flattenActions.sort(compareActions);
}

function sortActions(actions: Action[]): Action[] {
  actions.sort(compareActions);
  actions.forEach(action => {
    if (action.type === "group") {
      sortActions(action.actions!);
    }
  });
  return actions;
}

function compareActions(actionA: Action, actionB: Action): 0 | 1 | -1 {
  if (actionA.start > actionB.start) return 1;
  if (actionA.start < actionB.start) return -1;
  if (actionA.end > actionB.end) return 1;
  if (actionA.end < actionB.end) return -1;
  if (actionA.conflictPosition && actionB.conflictPosition) {
    if (actionA.conflictPosition > actionB.conflictPosition) return 1;
    if (actionA.conflictPosition < actionB.conflictPosition) return -1;
  }
  return 0;
}

/**
 * Removes a test action from the given array of test results.
 * @param results - The array of test results.
 * @param resultIndex - The index of the test result.
 * @param actionIndex - The index of the test action to remove.
 * @returns The updated array of test results.
 */
export function removeTestAction(results: TestResultExtExt[], resultIndex: number, actionIndex: number): TestResultExtExt[] {
  const result = results[resultIndex];
  result.actions.splice(actionIndex, 1);
  if (result.actions.length === 0) {
    results.splice(resultIndex, 1);
  }
  return results;
}

/**
 * Removes a test result from the given array of test results.
 * @param results - The array of test results.
 * @param resultIndex - The index of the test result to remove.
 * @returns The updated array of test results.
 */
export function removeTestResult(results: TestResultExtExt[], resultIndex: number): TestResultExtExt[] {
  results.splice(resultIndex, 1);
  return results;
}

function isAddFileAction(result: TestResultExtExt) {
  return result.actions.length === 1 && result.actions[0].type === "add_file";
}

function isRemoveFileAction(result: TestResultExtExt) {
  return result.actions.length === 1 && result.actions[0].type === "remove_file";
}

function isRenameFileAction(result: TestResultExtExt) {
  return result.actions.length >= 1 && result.actions[0].type === "rename_file";
}

export function getNewSourceByTestResult(result: TestResultExtExt): string | undefined {
  let source  = result.fileSource;
  for (const action of sortFlattenActions(flatActions(result.actions!)).reverse()) {
    if (action.type === "rename_file") {
      // nothing to do
    } else if (action.type === 'add_file') {
      source = action.newCode;
    } else if (action.type === 'remove_file') {
      source = undefined;
    } else if (action.type === "group") {
      for (const childAction of sortActions(action.actions!).reverse()) {
        source = source!.slice(0, childAction.start) + childAction.newCode + source!.slice(childAction.end);
      }
    } else {
      source = source!.slice(0, action.start) + action.newCode + source!.slice(action.end);
    }
  }
  return source;
}

/**
 * Replaces the source code by the given test result.
 *
 * @param results - The array of test results.
 * @param resultIndex - The index of the test result to replace.
 * @param pathAPI - The path API object.
 * @param promiseFsAPI - The promise-based file system API object.
 * @returns A promise that resolves to the updated array of test results.
 */
export async function replaceTestResult(results: TestResultExtExt[], resultIndex: number, pathAPI: PathAPI, promiseFsAPI: PromiseFsAPI): Promise<TestResultExtExt[]> {
  const result = results[resultIndex];
  const absolutePath = pathAPI.join(result.rootPath!, result.filePath);
  if (isAddFileAction(result)) {
    const dirPath = pathAPI.dirname(absolutePath);
    await promiseFsAPI.mkdir(dirPath, { recursive: true });
    await promiseFsAPI.writeFile(absolutePath, result.actions[0].newCode!);
  } else if (isRemoveFileAction(result)) {
    await promiseFsAPI.unlink(absolutePath);
  } else if (isRenameFileAction(result)) {
    const newSource = getNewSourceByTestResult(result);
    const newAbsolutePath = pathAPI.join(result.rootPath!, result.newFilePath!);
    await promiseFsAPI.unlink(absolutePath);
    await promiseFsAPI.writeFile(newAbsolutePath, newSource!);
  } else {
    const newSource = getNewSourceByTestResult(result);
    await promiseFsAPI.writeFile(absolutePath, newSource!);
  }
  results.splice(resultIndex, 1);
  return results;
}

/**
 * Replaces the source code by all test results.
 *
 * @param results - The array of test results to be replaced.
 * @param pathAPI - The PathAPI object.
 * @param promiseFsAPI - The PromiseFsAPI object.
 * @returns A promise that resolves to an array of replaced test results.
 */
export async function replaceAllTestResults(results: TestResultExtExt[], pathAPI: PathAPI, promiseFsAPI: PromiseFsAPI): Promise<TestResultExtExt[]> {
  while (results.length > 0) {
    await replaceTestResult(results, 0, pathAPI, promiseFsAPI);
  }
  return [];
}

function iterateActions(actions: Action[], func: (action: Action) => void) {
  actions.forEach((action) => {
    func(action);
    if (action.type === "group") {
      iterateActions(action.actions!, func);
    }
  });
}

function fixActionRanges(result: TestResultExtExt, offsets: { start: number, end: number, size: number }[]) {
  iterateActions(result.actions, (action) => {
    for (const offset of offsets) {
      if (action.start >= offset.end) {
        action.start = action.start + offset.size;
      }
      if (action.end >= offset.end) {
        action.end = action.end + offset.size;
      }
    }
  });
}

/**
 * Replaces the source code by the given test action.
 *
 * @param results - The array of test results.
 * @param resultIndex - The index of the test result.
 * @param actionIndex - The index of the action within the test result.
 * @param pathAPI - The path API object.
 * @param promiseFsAPI - The promise-based file system API object.
 * @returns The updated array of test results.
 */
export async function replaceTestAction(results: TestResultExtExt[], resultIndex: number, actionIndex: number, pathAPI: PathAPI, promiseFsAPI: PromiseFsAPI): Promise<TestResultExtExt[]> {
  const result = results[resultIndex];
  const action = result.actions[actionIndex];
  const absolutePath = pathAPI.join(result.rootPath!, result.filePath);
  if (action.type === 'add_file') {
    const dirPath = pathAPI.dirname(absolutePath);
    await promiseFsAPI.mkdir(dirPath, { recursive: true });
    await promiseFsAPI.writeFile(absolutePath, action.newCode!);
    results.splice(resultIndex, 1);
  } else if (action.type === 'remove_file') {
    await promiseFsAPI.unlink(absolutePath);
    results.splice(resultIndex, 1);
  } else if (action.type === 'rename_file') {
    const newAbsolutePath = pathAPI.join(result.rootPath!, result.newFilePath!);
    await promiseFsAPI.rename(absolutePath, newAbsolutePath);
    results.splice(resultIndex, 1);
  } else {
    const offsets: { start: number, end: number, size: number }[] = [];
    const actions = (action.type === "group" ? action.actions!.reverse() : [action]);
    let source = result.fileSource!;
    for (const childAction of actions) {
      source = source.slice(0, childAction.start) + childAction.newCode + source.slice(childAction.end);
      offsets.push({ start: childAction.start, end: childAction.end, size: childAction.newCode!.length - (childAction.end - childAction.start) });
    }
    await promiseFsAPI.writeFile(absolutePath, source);
    result.fileSource = source;
    result.actions.splice(actionIndex, 1);
    if (result.actions.length > 0) {
      fixActionRanges(result, offsets);
    } else {
      results.splice(resultIndex, 1);
    }
  }
  return results;
}