// a bridge event class over the W3C Event (react-native-renderer LegacySyntheticEvent): the module defines it at its load
export default class SyntheticEvent extends Event {
  constructor(type, options, nativeEvent) {
    super(type, options);
    this._nativeEvent = nativeEvent;
    this._propagationStopped = true;
  }

  get nativeEvent() {
    return this._nativeEvent;
  }

  stopPropagation() {
    this._propagationStopped = true;
    super.stopPropagation();
  }

  isPropagationStopped() {
    return this._propagationStopped;
  }
}

// a dispatch through an EventTarget: the listener sees the event's type and detail
export function relay(type, detail) {
  const target = new EventTarget();
  const seen = [];
  target.addEventListener(type, (e) => seen.push([e.type, e.detail, e instanceof Event]));
  target.dispatchEvent(new CustomEvent(type, { detail }));
  return seen;
}
