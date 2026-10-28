// An Error is compared by its class and its message, never by its stack text. A stack holds the file name and the
// frame columns of the copy that ran, which differ between a parent and a candidate by construction; a unit that
// logs `error.stack`, returns it or passes it to the outside shows the header (class and message) and the frames. The
// frames are not a behaviour of the unit (exec/fake.mjs render, design/stack-text.md).
import { logger } from "./log";

declare const __filename: string;

// logs the stack of an error it caught; the throw moves to its own lines, so the frame columns and lines change
export function logStack(x: number): number {
  let result = x;
  try {
    if (x < 0) {
      throw new Error("negative");
    }
  } catch (e) {
    logger.error("failed", (e as Error).stack);
    result = -1;
  }
  return result;
}

// the same, and the candidate changes the message
export function changedMessage(x: number): number {
  try { if (x < 0) throw new Error("negative value"); return x; }
  catch (e) { logger.error("failed", (e as Error).stack); return -1; }
}

// the same, and the candidate changes the class of the error
export function changedClass(x: number): number {
  try { if (x < 0) throw new RangeError("negative"); return x; }
  catch (e) { logger.error("failed", (e as Error).stack); return -1; }
}

// logs the error as text; the throw moves to its own lines
export function logString(x: number): number {
  let result = x;
  try {
    if (x < 0) {
      throw new Error("negative");
    }
  } catch (e) {
    logger.error("failed", String(e));
    result = -1;
  }
  return result;
}

// returns the stack in a field of the result; the throw moves to its own lines
export function returnsStack(x: number): { ok: boolean; detail?: string } {
  try {
    if (x < 0) {
      throw new Error("negative");
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: (e as Error).stack };
  }
}

// a string that holds "at" but is not a stack: the candidate changes the words after it
export function logNote(x: number): number {
  logger.info("waiting\n    at stage two (planner)", x);
  return x;
}

// the engine raises the error (a read of null): its stack is logged, the message is the same on both sides
export function engineStack(x: number): number {
  const holder: any = x > 0 ? null : {};
  let result = 0;
  try {
    result = holder.size + 1;
  } catch (e) {
    logger.error("failed", (e as Error).stack);
    result = -1;
  }
  return result;
}

// the engine raises the error and the unit lets it go: the candidate reads another property, so the message differs
export function engineMessage(x: number): number {
  const holder: any = x > 0 ? null : {};
  return holder.length + 1;
}

// logs the place it was loaded from: lean put the two copies in different places, which is not a behaviour of the unit
export function logWhere(x: number): number {
  logger.info("loaded from", import.meta.url, __filename, x);
  return x;
}

// the same place in a message, and the candidate changes the words after it
export function whereMessage(x: number): number {
  logger.error(`${__filename}: negative value`, x);
  return x;
}

// untouched
export function untouched(x: number): number { return x + 1; }
