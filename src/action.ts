import { TestResultExtExt, Action } from "./types";

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
 * Replaces the source code by result actions.
 * @param {TestResultExtExt} result - The test result containing the actions to replace.
 * @param {string} source - The source code to perform the replacements on.
 * @returns {string} The modified source code.
 */
export function replaceTestResult(result: TestResultExtExt, source: string): string {
  for (const action of sortFlattenActions(flatActions(result.actions)).reverse()) {
    if (action.type === 'group') {
      for (const childAction of sortActions(action.actions!).reverse()) {
        source = source.slice(0, childAction.start) + childAction.newCode + source.slice(childAction.end);
      }
    } else {
      source = source.slice(0, action.start) + action.newCode + source.slice(action.end);
    }
  }
  return source;
}

function iterateActions(actions: Action[], func: (action: Action) => void) {
  actions.forEach((action) => {
    func(action);
    if (action.type === "group") {
      iterateActions(action.actions!, func);
    }
  });
}

/**
 * Replaces the source code by the action.
 * @param {TestResultExtExt} result - The test result.
 * @param {Action} action - The action to replace.
 * @param {string} source - The source code.
 * @returns {string} The modified source code.
 */
export function replaceTestAction(result: TestResultExtExt, action: Action, source: string): string {
  const offsets: { start: number, end: number, size: number }[] = [];
  if (action.type === "group") {
    action.actions!.reverse().forEach((childAction) => {
      source = source.slice(0, childAction.start) + childAction.newCode + source.slice(childAction.end);
      offsets.push({ start: childAction.start, end: childAction.end, size: childAction.newCode!.length - (childAction.end - childAction.start) });
    });
  } else {
    source = source.slice(0, action.start) + action.newCode + source.slice(action.end);
    offsets.push({ start: action.start, end: action.end, size: action.newCode!.length - (action.end - action.start) });;
  }
  if (result.actions.length > 0) {
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
    result.fileSource = source;
  }
  return source;
}