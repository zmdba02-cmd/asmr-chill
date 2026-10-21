// =====================================================================
// auth.ts — login sederhana berbasis password tunggal (HANYA di sisi server).
//
// Kalau APP_PASSWORD diisi, semua halaman & API butuh cookie sesi (lihat proxy.ts).
// Cookie berisi HMAC dari password, jadi tidak ada database sesi yang perlu disimpan, dan
// mengganti APP_PASSWORD otomatis mengeluarkan semua perangkat.
// =====================================================================
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "asmr_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

export function sessionToken(password: string): string {
  return createHmac("sha256", password).update("asmr-session-v1").digest("hex");
}

// Bandingkan dua teks tanpa membocorkan apa pun lewat selisih waktu.
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function isValidSession(cookie: string | undefined, password: string): boolean {
  return Boolean(cookie) && safeEqual(cookie as string, sessionToken(password));
}

// Hanya izinkan alamat di situs ini ("/favorites"), bukan "//evil.com" atau "https://...".
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}
