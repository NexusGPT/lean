declare module "framework" {
  export function Param(name: string, pipe?: string): ParameterDecorator;
  export function Post(): MethodDecorator;
}
