import axios from 'axios';
export async function own(): Promise<number> { const r = await axios.get('https://api.example.com/items'); return 0; }
