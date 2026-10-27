declare module "@nestjs/common" {
  export function UseGuards(...guards: unknown[]): MethodDecorator & ClassDecorator;
  export function Get(path?: string): MethodDecorator;
  export function Post(path?: string): MethodDecorator;
  export function Param(property?: string, ...pipes: unknown[]): ParameterDecorator;
  export function Body(...pipes: unknown[]): ParameterDecorator;
  export function SetMetadata(key: string, value: unknown): MethodDecorator & ClassDecorator;
  export class ParseIntPipe { transform(value: string): number; }
  export class ParseFloatPipe { transform(value: string): number; }
}
declare module "@nestjs/passport" {
  export function AuthGuard(strategy: string): unknown;
}
declare namespace Reflect {
  function getMetadata(key: unknown, target: object): any;
  function defineMetadata(key: unknown, value: unknown, target: object): void;
}
