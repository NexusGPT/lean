// expect: global-read
// a global no lib or @types package declares (a build-time define) has no declared type to read: it stays refused
export function appVersion(): string {
  return __APP_VERSION__;
}
