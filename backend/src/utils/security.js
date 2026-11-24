import crypto from "crypto";

export function randomDigits(length = 6) {
  const max = 10 ** length;
  let value;
  do {
    value = crypto.randomInt(0, max);
  } while (value >= max);
  return String(value).padStart(length, "0");
}

export function hashSecret(value, pepper = process.env.OTP_PEPPER || "") {
  return crypto.createHmac("sha256", pepper).update(String(value)).digest("hex");
}

export function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(bytes = 20) {
  const input = crypto.randomBytes(bytes);
  let bits = "";
  for (const byte of input) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let output = "";
  for (let offset = 0; offset < bits.length; offset += 5) {
    const chunk = bits.slice(offset, offset + 5).padEnd(5, "0");
    output += BASE32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return output;
}

export function base32Decode(input) {
  const normalized = String(input).replace(/[\s=-]/g, "").toUpperCase();
  let bits = "";
  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

export function totpCode(secret, timestamp = Date.now(), period = 30, digits = 6) {
  const counter = Math.floor(timestamp / 1000 / period);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", base32Decode(secret))
    .update(buffer)
    .digest();
  const offset = digest[digest.length - 1] & 0xf;
  const number = ((digest[offset] & 0x7f) << 24 |
    (digest[offset + 1] & 0xff) << 16 |
    (digest[offset + 2] & 0xff) << 8 |
    (digest[offset + 3] & 0xff)) >>> 0;
  return String(number % (10 ** digits)).padStart(digits, "0");
}

export function verifyTotp(secret, code) {
  if (!/^\d{6}$/.test(String(code))) return false;
  const now = Date.now();
  for (const step of [-1, 0, 1]) {
    if (secureEqual(totpCode(secret, now + step * 30 * 1000), String(code))) {
      return true;
    }
  }
  return false;
}
