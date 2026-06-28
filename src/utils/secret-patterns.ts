const SECRET_KEY_PATTERNS = [
  /secret/i,
  /password/i,
  /passwd/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /auth/i,
  /credential/i,
  /cert/i,
];

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((re) => re.test(key));
}
