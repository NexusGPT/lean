// the axios declarations the pair reads (axios 1's own types, narrowed)
declare module 'axios' {
  export interface AxiosResponse { status: number; config: { url?: string }; }
  const axios: { get(url: string): Promise<AxiosResponse> };
  export default axios;
}
