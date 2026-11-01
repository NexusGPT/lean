// TextEncoder and TextDecoder: the real classes (the Encoding standard, Node's); pure, nothing to fake. A decoder is
// rendered by its settings (an encoder has none), the state the standard gives it.
export const HostTextEncoder = globalThis.TextEncoder;
export const HostTextDecoder = globalThis.TextDecoder;
export const renderEncoder = () => ({ $textEncoder: 'utf-8' });
export const renderDecoder = (d) => ({ $textDecoder: { encoding: d.encoding, fatal: d.fatal, ignoreBOM: d.ignoreBOM } });
