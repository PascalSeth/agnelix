import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

/**
 * AES-256-GCM encryption for secrets at rest (SMTP passwords, app passwords).
 *
 * Ciphertext format: enc:v1:<iv b64>:<authTag b64>:<ciphertext b64>
 * Values without the prefix are treated as legacy plaintext and passed through
 * by decryptSecret, so existing rows keep working until they are re-saved.
 *
 * Requires ENCRYPTION_KEY in the environment (any string; it is hashed to a
 * 32-byte key). Without it, encryptSecret stores plaintext and warns.
 */

const PREFIX = "enc:v1:"

function getKey(): Buffer | null {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) return null
  return createHash("sha256").update(secret).digest()
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX)
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return plaintext
  if (isEncrypted(plaintext)) return plaintext
  const key = getKey()
  if (!key) {
    console.warn("[crypto] ENCRYPTION_KEY is not set — storing secret unencrypted. Set ENCRYPTION_KEY to enable AES-256-GCM at rest.")
    return plaintext
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`
}

export function decryptSecret(value: string): string {
  if (!value || !isEncrypted(value)) return value // legacy plaintext passthrough
  const key = getKey()
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set but an encrypted secret was found. Restore the key to decrypt stored credentials.")
  }
  const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(":")
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]).toString("utf8")
}
