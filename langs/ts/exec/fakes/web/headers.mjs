// Headers: the platform's own class (Node's, the Fetch standard's), unchanged. A Headers object holds no own fields, so
// the generic rendering showed every one as `{}` and two requests that differ only in a header looked alike; it is
// rendered by its entries, in the standard's order (lower-cased names, sorted), so a dropped or changed header shows.
export const HostHeaders = globalThis.Headers;
export const headerEntries = (h) => [...HostHeaders.prototype.entries.call(h)];
export const renderHeaders = (h) => ({ $headers: headerEntries(h) });
