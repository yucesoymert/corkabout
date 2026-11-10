// Read-aloud with the browser's own voices (Web Speech API): free, no key, works offline with the OS voices.
// ponytail: voices differ per device; switch to a cloud TTS (ElevenLabs/OpenAI, audio cached in Blob) if quality matters

/** "tr-TR" if the text has Turkish letters, else "en-US". */
// ponytail: letter heuristic; a Turkish sentence without ç/ğ/ı/ö/ş/ü is read in English
export const langOf = (text: string) => (/[çğıöşüÇĞİÖŞÜ]/.test(text) ? "tr-TR" : "en-US");

/** Sentence-sized pieces: Chrome's online voices stop after ~15 s of one utterance. */
export function chunks(text: string, max = 220) {
  const out: string[] = [];
  for (const sentence of text.replace(/\s+/g, " ").trim().match(/[^.!?…]+[.!?…]*\s*/g) ?? []) {
    let rest = sentence.trim();
    while (rest.length > max) {
      const cut = rest.lastIndexOf(" ", max);
      out.push(rest.slice(0, cut > 0 ? cut : max));
      rest = rest.slice(cut > 0 ? cut + 1 : max);
    }
    if (rest) out.push(rest);
  }
  return out;
}

// The key of what is being read right now (a card id, "focus:<id>"...), so buttons can show play / stop.
let current: string | null = null;
const listeners = new Set<() => void>();
const setCurrent = (key: string | null) => {
  current = key;
  listeners.forEach((l) => l());
};
export const subscribeSpeech = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
export const speakingKey = () => current;

const PREFERRED: Record<string, string[]> = { "en-US": ["Samantha", "Google US English", "Ava", "Allison"], "tr-TR": ["Yelda", "Google Türkçe"] };
function voiceFor(lang: string) {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").startsWith(lang.slice(0, 2)));
  return PREFERRED[lang]?.map((n) => voices.find((v) => v.name.startsWith(n))).find(Boolean) ?? voices.find((v) => v.lang === lang) ?? voices[0];
}

export function stop() {
  speechSynthesis.cancel();
  setCurrent(null);
}

/** Reads the text aloud; speaking the same key again stops it. */
export function speak(key: string, text: string) {
  if (current === key) return stop();
  speechSynthesis.cancel();
  const lang = langOf(text);
  const voice = voiceFor(lang);
  const parts = chunks(text);
  if (!parts.length) return;
  setCurrent(key);
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = lang;
    if (voice) u.voice = voice;
    if (i === parts.length - 1) u.onend = () => current === key && setCurrent(null);
    u.onerror = () => current === key && setCurrent(null);
    speechSynthesis.speak(u);
  });
}
