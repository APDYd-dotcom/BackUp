import test from "node:test";
import assert from "node:assert/strict";
import {
  generateTotpSecret,
  totpCode,
  verifyTotp,
  randomDigits,
  hashSecret,
  secureEqual,
} from "../src/utils/security.js";

test("randomDigits returns only the requested number of digits", () => {
  const value = randomDigits(6);
  assert.match(value, /^\d{6}$/);
});

test("secret hashes are constant-time comparable", () => {
  assert.equal(secureEqual(hashSecret("123456"), hashSecret("123456")), true);
  assert.equal(secureEqual(hashSecret("123456"), hashSecret("654321")), false);
});

test("TOTP secret generates a valid six-digit code", () => {
  const secret = generateTotpSecret();
  const code = totpCode(secret);
  assert.match(code, /^\d{6}$/);
  assert.equal(verifyTotp(secret, code), true);
});

test("TOTP rejects malformed codes", () => {
  const secret = generateTotpSecret();
  assert.equal(verifyTotp(secret, "abcdef"), false);
});
