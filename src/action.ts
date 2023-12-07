import { TestResultExtExt, Action } from "./types";

function iterateActions(actions: Action[], func: (action: Action) => void) {
  actions.forEach((action) => {
    func(action);
    if (action.type === "group") {
      iterateActions(action.actions!, func);
    }
  });
}

/**
 * Replaces the source code with the result action.
 * @param {TestResultExtExt[]} results - The array of test results.
 * @param {number} resultIndex - The index of the test result.
 * @param {number} actionIndex - The index of the action within the test result.
 * @param {string} source - The source code to modify.
 * @returns {string} The modified source code.
 */
export function replaceTestAction(results: TestResultExtExt[], resultIndex: number, actionIndex: number, source: string): string {
  const currentResult = results[resultIndex];
  const currentAction = currentResult.actions[actionIndex];
  const offsets: { start: number, end: number, size: number }[] = [];
  if (currentAction.type === "group") {
    currentAction.actions!.reverse().forEach((action) => {
      source = source.slice(0, action.start) + action.newCode + source.slice(action.end);
      offsets.push({ start: action.start, end: action.end, size: action.newCode!.length - (action.end - action.start) });
    });
  } else {
    source = source.slice(0, currentAction.start) + currentAction.newCode + source.slice(currentAction.end);
    offsets.push({ start: currentAction.start, end: currentAction.end, size: currentAction.newCode!.length - (currentAction.end - currentAction.start) });;
  }
  currentResult.actions.splice(actionIndex, 1);
  if (currentResult.actions.length > 0) {
    iterateActions(currentResult.actions, (action) => {
      for (const offset of offsets) {
        if (action.start >= offset.end) {
          action.start = action.start + offset.size;
        }
        if (action.end >= offset.end) {
          action.end = action.end + offset.size;
        }
      }
    });
    currentResult.fileSource = source;
  } else {
    results.splice(resultIndex, 1);
  }
  return source;
}