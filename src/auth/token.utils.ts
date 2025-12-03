import * as crypto from 'crypto';

export function generateRandomHex(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function composeToken(id: string, raw: string) {
  return `${id}.${raw}`;
}

export function parseCompositeToken(composite: string) {
  if (!composite) return null;
  const [id, raw] = composite.split('.');
  if (!id || !raw) return null;
  return { id, raw };
}
