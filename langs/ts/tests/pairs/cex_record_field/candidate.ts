interface Order { id: string; express: boolean }
const VIP = 'vip';

// The shipping lane of an order; one account's orders always ship fast.
export function lane(o: Order): string {
  if (!o.express && o.id === VIP + '-0001') return 'fast';
  return o.express ? 'fast' : 'slow';
}
