import type { Box } from './types';

export function relay(b: Box, state?: string): Box {
  b.h.setting.state = state ?? '';
  return b;
}
