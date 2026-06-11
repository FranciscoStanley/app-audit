import { decryptToken, encryptToken } from './token-cipher';

describe('token-cipher', () => {
  const secret = 'test-secret-key-for-cipher-32chars!!';

  it('cifra e decifra token GitHub', () => {
    const plain = 'gho_abcdefghijklmnopqrstuvwxyz123456';
    const enc = encryptToken(plain, secret);
    expect(enc).not.toContain(plain);
    expect(decryptToken(enc, secret)).toBe(plain);
  });
});
