# SRK Flowers — Billing App / எஸ்.ஆர்.கே. மலர்கள் பில்லிங்

A simple, secure, Tamil + English billing app for SRK Flowers (a florist
wholesale business). Built mobile-first for Android, free to run.

## 👉 To set it up, read [`SETUP-GUIDE.md`](./SETUP-GUIDE.md)

That guide is written in plain language and takes ~25 minutes, no coding needed.

---

## Features

- 🔐 **Login** with roles — Admin (full control) and Staff (daily billing)
- 🌐 **Tamil + English** everywhere; bills show both languages
- 📍 **Places → Merchants → Bills** — the way the shop actually works
- 🧾 **Daily billing** — flower, kilo, rate, auto total, luggage, old balance,
  grand total
- 💬 **One-tap WhatsApp** — bill as image/PDF, opens the merchant's chat
- 🌿 **Stock/inventory** — categories, low-stock alerts, auto-deduct on billing
- 💰 **Payments** — record payments, "mark as paid"
- 📊 **Reports** — monthly sales, who hasn't paid, low stock
- ⚙️ **Editable shop details** — header/footer, owner, phone, address, map,
  website
- 📱 **Installable** on Android (PWA)

## Tech (all free)

- React + Vite, Tailwind CSS
- Supabase (Postgres database + auth + row-level security)
- html-to-image + jsPDF for bills
- Deploy on Netlify

## Project layout

```
src/
  components/   reusable UI, layout, bill paper
  context/      auth + language (Tamil/English)
  lib/          supabase client, strings, formatting, bill export
  pages/        login, home, places, merchants, billing, stock, reports, settings
supabase/
  schema.sql    tables + security rules (run once)
  seed.sql      starter flowers + places (optional)
```

## Local development

```
npm install
npm run dev
```

Set your Supabase keys in `.env` first (see the setup guide).
