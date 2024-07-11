export function isEqual(value1, value2) {
    // Handle simple types and null
    if (value1 === value2) return true;
    if (typeof value1 !== typeof value2) return false;
    if (value1 == null || value2 == null) return false;

    // Handle Dates
    if (value1 instanceof Date && value2 instanceof Date) {
        return value1.getTime() === value2.getTime();
    }

    // Handle Arrays
    if (Array.isArray(value1) && Array.isArray(value2)) {
        if (value1.length !== value2.length) return false;
        for (let i = 0; i < value1.length; i++) {
            if (!isEqual(value1[i], value2[i])) return false;
        }
        return true;
    }

    // Handle Objects
    if (typeof value1 === 'object' && typeof value2 === 'object') {
        const keys1 = Object.keys(value1);
        const keys2 = Object.keys(value2);
        if (keys1.length !== keys2.length) return false;
        for (let key of keys1) {
            if (!keys2.includes(key) || !isEqual(value1[key], value2[key])) return false;
        }
        return true;
    }

    // If we've made it this far, the values are not equal
    return false;
}