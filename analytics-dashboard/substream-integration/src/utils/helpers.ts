export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function validateAddress(address: string): boolean {
  const addressPattern = /^0x[a-fA-F0-9]{40}$/;
  return addressPattern.test(address);
}

export function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp);
}

export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === '';
}