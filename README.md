# Corkabout

**Pin your cards on an endless board and arrange them your way.**

Corkabout is a visual card board for notes, language study, interview prep and inspiration. Drop a card anywhere, drag it around, group it by tag, and zoom out to see the whole picture.

👉 **[corkabout.mertyucesoy.dev](https://corkabout.mertyucesoy.dev)** · Turkish and English · free, sign in with Google

## Why Corkabout

- **Endless board**: pan, zoom and place cards wherever they make sense. Nothing is stuck in a list.
- **Tidy in one click**: arrange cards into tag columns, tag rows or a grid, with undo.
- **Study mode**: focus on one card at a time and have it read aloud.
- **Works on your phone**: pinch to zoom, hold to move, tap to edit.
- **Light and dark**: follows your system or your choice.

## Built with

Next.js 16 · React · Tailwind CSS · Auth.js (Google) · Drizzle ORM · Neon Postgres · Vercel

## Run locally

```bash
pnpm install
cp .env.example .env.local   # fill in Google OAuth, AUTH_SECRET and DATABASE_URL
pnpm db:migrate
pnpm seed --email test@corkabout.test --create-user --file <old-page.html>   # optional sample board
pnpm dev                     # then open http://localhost:3000/api/dev/login
```

| Command | What it does |
|---|---|
| `pnpm test` | Unit tests (node:test) |
| `pnpm lint` | ESLint |
| `pnpm import-board <file.json> --email <you>` | Import a board from JSON (`{ title, cards: [{ tag, title, answer }] }`) |
