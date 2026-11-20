const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatMoney(cents: number): string {
  return currency.format(cents / 100);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}
