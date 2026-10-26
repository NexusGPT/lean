const { call } = await import('lean-declared-fake');
export function dynamicFake(): number { return typeof call === 'function' ? 1 : (() => { throw new Error('fake export missing'); })(); }
