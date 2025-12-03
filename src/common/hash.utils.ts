/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

// eslint-disable-next-line @typescript-eslint/require-await
export async function hashData(data: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return bcrypt.hash(data, SALT_ROUNDS);
}

export async function compareHash(
  data: string,
  hash: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return bcrypt.compare(data, hash);
}
