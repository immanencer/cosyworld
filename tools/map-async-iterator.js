export async function* mapAsyncIterator(iterator, mapFn) {
    for await (const item of iterator) {
        yield mapFn(item);
    }
}