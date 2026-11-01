/// <reference path="/root/lanes/w1g-opaque-handed/tree/langs/ts/tests/pairs/decorators/types.d.ts" />
export function one(handler: object): boolean { return Reflect.getMetadata("role", handler) === "admin"; }
export function two(handler: object): boolean { return Reflect.getMetadata("role", handler) === "admin"; }
export function three(handler: object): boolean { return Reflect.getMetadata("role", handler) === "admin"; }
export function four(handler: object): boolean { return Reflect.getMetadata("role", handler) === "admin"; }