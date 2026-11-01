// a build-time fork: the bundler replaces this module with a host's own; loaded as written it throws
export function announce(n: number): void {}
throw new Error('This module must be shimmed by a specific host.');
