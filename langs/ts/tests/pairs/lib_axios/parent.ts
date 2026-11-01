import axios from 'axios';
// a response carries the request's own configuration (lane B: the vendored axios, its request answered from the world's table)
export async function own(): Promise<number> { const r = await axios.get('https://api.example.com/items'); return r.config.url === 'https://api.example.com/items' ? 1 : 0; }
