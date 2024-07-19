// fuzzyMatch.js

const levenshteinDistance = (a, b) => {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // Substitution
                    matrix[i][j - 1] + 1, // Insertion
                    matrix[i - 1][j] + 1 // Deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

const calculateSimilarity = (a, b) => {
    const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
    const maxLen = Math.max(a.length, b.length);
    return (maxLen - distance) / maxLen;
};

const fuzzyMatch = (array, key, target, threshold = 0.8) => {
    let bestMatch = null;
    let highestSimilarity = 0;

    for (const item of array) {
        const similarity = calculateSimilarity(target, item[key]);
        if (similarity > highestSimilarity && similarity >= threshold) {
            highestSimilarity = similarity;
            bestMatch = item;
        }
    }

    return bestMatch;
};

export { fuzzyMatch };
