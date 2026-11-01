interface Order { id: string; express: boolean }

// The shipping lane of an order.
export function lane(o: Order): string {
  return o.express ? 'fast' : 'slow';
}
