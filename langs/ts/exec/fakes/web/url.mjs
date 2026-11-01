// URL and URLSearchParams: the real classes (WHATWG URL, Node's), pure functions of their inputs; nothing to fake. Both
// keep their state in internal slots, so the generic rendering showed every URL as `{}`: a unit that returns, stores or
// sends a URL object built from another path was the same as the parent. Each is rendered by its serialisation, the
// one text the standard defines for it.
export const HostURL = globalThis.URL;
export const HostURLSearchParams = globalThis.URLSearchParams;
export const renderURL = (u) => ({ $url: u.href });
export const renderSearchParams = (p) => ({ $searchParams: p.toString() });
