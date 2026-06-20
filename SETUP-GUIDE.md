# SRK Flowers — Setup Guide / அமைப்பு வழிகாட்டி

This guide takes you from zero to a working app on your phone. Everything here
is **100% free**. Do it once. Total time: about 20–30 minutes.

You do **not** need to know coding. Just follow the steps in order.

---

## What you are building

A billing app for SRK Flowers that:

- Needs a **login** (only your 5–8 people can enter)
- Shows everything in **Tamil + English**
- Has **places → merchants → daily bills**
- Makes a **bill** and sends it to the merchant's **WhatsApp** in one tap
- Tracks **flower stock** and warns when it is low
- Shows **reports** (this month's sales, who has not paid)
- Installs on your **Android phone** like a normal app

---

## Part 1 — Create the free database (Supabase)

Supabase gives you a secure online database + login system, free.

1. Go to **https://supabase.com** and click **Start your project** → sign in with
   Google (use `deepasrk4020@gmail.com` or your own).
2. Click **New project**.
   - **Name:** `srk-flowers`
   - **Database Password:** type a strong password and **save it somewhere** (you
     rarely need it again, but keep it safe).
   - **Region:** choose **South Asia (Mumbai)** — closest to Tamil Nadu, fastest.
   - Click **Create new project** and wait ~2 minutes while it sets up.

### 1a. Create the tables (paste the schema)

1. In the left menu click **SQL Editor** → **New query**.
2. Open the file **`supabase/schema.sql`** from this project, copy **everything**,
   paste it into the editor, and click **Run** (or press Ctrl+Enter).
3. You should see *Success. No rows returned*. Done — all tables and security
   rules are created.

### 1b. Add starter flowers & places (optional but recommended)

1. **SQL Editor** → **New query** again.
2. Open **`supabase/seed.sql`**, copy everything, paste, and **Run**.
3. This adds Rose/ரோஜா, Jasmine/மல்லி, Marigold/சாமந்தி etc. and the places
   Cuddalore, Virudhachalam, Panruti. You can edit/delete all of these later
   inside the app.

---

## Part 2 — Connect the app to your database

1. In Supabase, click **Project Settings** (gear icon) → **API**.
2. You will see two values:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon public** key (a long text starting with `eyJ...`)
3. In this project folder, open the file named **`.env`** and fill it in:

   ```
   VITE_SUPABASE_URL=https://abcdxyz.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ....(the long anon public key)
   ```

4. Save the file.

> The `anon public` key is safe to use in the app — your data is still protected
> by the security rules from Part 1a. Never share the **service_role** key.

---

## Part 3 — Create your login users

1. In Supabase, left menu → **Authentication** → **Users** → **Add user** →
   **Create new user**.
2. Enter an **email** and a **password** for each person (5–8 users).
   - Tick **Auto Confirm User** so they can log in immediately.
3. **Very important:** the **first** user you create becomes the **Admin**
   automatically. Make the first user **you / Deepa** — admin can edit places,
   merchants, flowers, and shop details. The rest become **Staff** (they do daily
   billing only).
4. You can change anyone between Admin/Staff later inside the app → **Settings →
   Users**.

---

## Part 4 — Run it on your computer (to test)

In a terminal inside this folder:

```
npm install      (only the first time)
npm run dev
```

Open the link it shows (usually `http://localhost:5173`). Log in with one of the
users you created. Try adding a place, a merchant, and a bill.

---

## Part 5 — Put it online + install on the phone (free)

So your phone can use it from anywhere, host it free on **Netlify**.

### Easiest way (drag & drop)

1. On the computer, run `npm run build`. This creates a **`dist`** folder.
2. Go to **https://app.netlify.com/drop** and **drag the `dist` folder** onto the
   page.
3. Netlify gives you a web link like `https://srk-flowers.netlify.app`.
   - **Important:** add your Supabase keys in Netlify too →
     **Site settings → Environment variables** → add `VITE_SUPABASE_URL` and
     `VITE_SUPABASE_ANON_KEY` → then **re-deploy** (drag the new `dist` again).

> Tip: For automatic updates, connect this project to a free GitHub repo and link
> it to Netlify. Then it rebuilds itself whenever you change something. (Ask for
> help with this step if you want it.)

### Install on the Android phone

1. Open the Netlify link in **Chrome** on the phone.
2. Tap the **⋮ menu → Add to Home screen / Install app**.
3. The SRK Flowers logo appears on the home screen. Open it — it runs full-screen
   like a real app.

---

## Part 6 — Daily use (for everyone)

1. **Home** shows pending money and low stock at a glance.
2. **Places** → tap a town → tap a merchant → **+ New Bill**.
3. Pick flowers, type **kilo** and **rate** — the total is automatic. Add
   **luggage**. Old balance is added automatically.
4. **Save Bill** → on the bill page tap **Send on WhatsApp**. Choose the
   merchant's chat and press send. Stock is reduced automatically.
5. When a merchant pays, open the merchant → **Record Payment** (or open the bill
   → **Mark as Paid**).
6. **Settings** (admin) → edit shop name, owner, phone, address, website, map
   link and the footer message any time.

---

## Common questions

- **Can two people use it at the same time?** Yes — all 5–8 users share the same
  live data.
- **Is the data backed up?** Yes, Supabase keeps it online and backed up. Nothing
  is stored only on one phone.
- **Forgot a password?** Admin can reset it in Supabase → Authentication → Users.
- **Bill not in Tamil?** Bills always show **both** English and Tamil headings.
  Use the தமிழ்/EN toggle at the top to switch the rest of the app.

Need help with any step? Keep this file open and ask.
