import * as originalModule from '../services/taskModule.js';

function warnOnce() {
    if (!warnOnce.hasWarned) {
        console.warn('WARNING: You are using a deprecated version of the task module. Please update your imports to use the new module directly.');
        warnOnce.hasWarned = true;
    }
}

warnOnce.hasWarned = false;

export function createTask(...args) {
    warnOnce();
    return originalModule.createTask(...args);
}

export function getTaskStatus(...args) {
    warnOnce();
    return originalModule.getTaskStatus(...args);
}

export function pollTaskCompletion(...args) {
    warnOnce();
    return originalModule.pollTaskCompletion(...args);
}

export function waitForTask(...args) {
    warnOnce();
    return originalModule.waitForTask(...args);
}

// Re-export any constants or other exports from the original module
export * from '../services/taskModule.js';