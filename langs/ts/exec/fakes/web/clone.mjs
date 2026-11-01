// structuredClone: the real algorithm (HTML's structured serialisation, Node's). A value lean's world handed the unit (a
// recording fake) is a function object to the algorithm and fails with the DataCloneError the platform raises for a
// function: the same on both sides, observed by its class (design/w2c-web-fakes.md, what is open).
export const hostStructuredClone = globalThis.structuredClone;
