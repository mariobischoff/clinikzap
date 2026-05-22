export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits.startsWith('55') && digits.length <= 11) {
    return '55' + digits;
  }
  return digits;
}
