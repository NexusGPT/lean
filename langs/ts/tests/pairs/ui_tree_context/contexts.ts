/// <reference path="./types.d.ts" />
import { createContext } from "react";
// two contexts of React's own: a theme name, and a counter with the function that bumps it
export const Theme = createContext<string>("light");
export const Count = createContext<{ count: number; bump: () => void }>({ count: 0, bump: () => {} });
