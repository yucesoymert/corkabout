// Per-user caps keep the free Neon storage (1 GB) safe from one runaway account: 2,000 cards × 10k chars ≈ 20 MB.
export const MAX_BOARDS = 50;
export const MAX_CARDS = 2_000;

// Photos (Vercel Blob, 1 GB on the free tier): a few for everyone, more with Pro, no cap for the owners in UNLIMITED_EMAILS.
export const MAX_PHOTOS_FREE = 5;
export const MAX_PHOTOS_PRO = 1_000; // ponytail: Pro still has a cap so one account can't fill the store; raise with the Blob plan

/** How many photos this account may keep; null = no limit. */
export function photoLimit(email: string | null | undefined, proUntil: Date | null, now = new Date(), unlimited = process.env.UNLIMITED_EMAILS ?? "") {
  const owners = unlimited.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (email && owners.includes(email.toLowerCase())) return null;
  return proUntil && proUntil > now ? MAX_PHOTOS_PRO : MAX_PHOTOS_FREE;
}

/** Only our own Blob store's public URLs may be saved as card photos (no outside images or tracking pixels). */
export const isOurPhoto = (url: string, storeId = process.env.BLOB_STORE_ID ?? "") => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !!storeId && u.hostname === `${storeId.replace(/^store_/, "").toLowerCase()}.public.blob.vercel-storage.com`;
  } catch {
    return false;
  }
};
