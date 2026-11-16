"use client";

import { Image as ImageIcon, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/tr";
import { fill } from "@/lib/format";

export type Draft = { tag: string | null; title: string; body: string; file?: File };
export type Photos = { used: number; limit: number | null }; // limit null = no limit

// New-card form in screen pixels (a <dialog>), so its size doesn't follow the canvas zoom.
// Enter in a one-line field moves on, ⌘/Ctrl+Enter adds, Esc cancels.
export function Composer({
  tags,
  tag,
  t,
  photos,
  onAdd,
  onPaywall,
  onClose,
}: {
  tags: string[];
  tag: string | null;
  t: Dictionary["board"];
  photos: Photos;
  onAdd: (d: Draft) => void;
  onPaywall: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const full = photos.limit !== null && photos.used >= photos.limit;
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  useEffect(() => {
    dialog.current?.showModal(); // focuses the first field (tag); the title is where typing starts
    (form.current?.elements.namedItem("title") as HTMLInputElement | null)?.focus();
  }, []);

  const submit = () => {
    const fd = new FormData(form.current!);
    const text = (k: string) => String(fd.get(k) ?? "");
    const draft = { tag: text("tag").replace(/\s+/g, " ").trim().slice(0, 40) || null, title: text("title").replace(/\s+/g, " ").trim(), body: text("body").replace(/\s+$/, "") };
    if (draft.title || draft.body || file) onAdd(file ? { ...draft, file } : draft);
    dialog.current?.close();
  };
  const keys = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return;
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      submit();
    } else if (el.tagName === "INPUT") {
      e.preventDefault();
      (form.current?.elements.namedItem(el.name === "tag" ? "title" : "body") as HTMLElement | null)?.focus();
    }
  };

  const field = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";
  return (
    <dialog ref={dialog} onClose={onClose} aria-label={t.newCard} className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl bg-white p-5 text-neutral-900 shadow-xl backdrop:bg-black/30">
      <form
        ref={form}
        onKeyDown={keys}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-3"
      >
        <h2 className="font-semibold">{t.newCard}</h2>
        <input name="tag" defaultValue={tag ?? ""} list="composer-tags" maxLength={40} placeholder={t.tagPlaceholder} aria-label={t.tagPlaceholder} className={`${field} text-xs tracking-[.08em] uppercase`} />
        <datalist id="composer-tags">
          {tags.map((tg) => (
            <option key={tg} value={tg} />
          ))}
        </datalist>
        <input name="title" maxLength={1_000} placeholder={t.titlePlaceholder} aria-label={t.titlePlaceholder} className={`${field} font-serif text-[17px] font-bold text-ink`} />
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, nothing for next/image to optimise */}
            <img src={preview} alt={t.photo} className="max-h-48 w-full rounded-lg object-cover" />
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              aria-label={t.removePhoto}
              title={t.removePhoto}
              className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
        <input
          ref={picker}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            e.currentTarget.value = ""; // picking the same file again still fires change
            if (!f) return;
            setFile(f);
            setPreview(URL.createObjectURL(f));
          }}
        />
        <textarea name="body" rows={preview ? 3 : 7} maxLength={50_000} placeholder={t.bodyPlaceholder} aria-label={t.bodyPlaceholder} className={`${field} resize-y text-sm leading-relaxed`} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (full && !file ? onPaywall() : picker.current?.click())}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
          >
            <ImageIcon className="size-4" aria-hidden />
            {file ? t.changePhoto : t.addPhoto}
          </button>
          {photos.limit !== null && (
            <span className={`text-xs tabular-nums ${full ? "font-medium text-cork" : "text-neutral-500"}`}>{fill(t.photoCount, { used: photos.used, limit: photos.limit })}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-auto hidden text-xs text-neutral-500 sm:inline">{t.composerHint}</span>
          <span className="mr-auto sm:hidden" />
          <button type="button" onClick={() => dialog.current?.close()} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-neutral-100">
            {t.cancel}
          </button>
          <button className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">{t.add}</button>
        </div>
      </form>
    </dialog>
  );
}

const MAX_SIDE = 1600;
/** Phone photos are 3-12 MB; a webp with the long side at 1600 px is a few hundred KB and still sharp on the board.
 * GIFs stay as they are (a canvas would keep only the first frame), and so does anything the browser can't decode. */
export async function shrink(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file); // applies the EXIF rotation
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
    return blob && blob.size < file.size ? new File([blob], "photo.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}
