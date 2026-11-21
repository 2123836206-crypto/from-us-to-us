# From Us, To Us

This is a static website with a Supabase database backend. The production site is connected to the Supabase project created for From Us, To Us. The steps below document how to recreate or maintain the setup.

## What works in the site code

- The 27 collected entries are in `data/letters.json` and `supabase/seed.sql`.
- Missing programmes in the collected data are stored as `Unknown`; unknown cohort years are left blank.
- Existing letters are seeded as published, as requested. Their titles are editorial labels because the source document did not include titles.
- A new submission only requires the letter text. Name, title, email, programme, cohort, and theme are optional. Publication consent is required because the letter appears in the public archive immediately.
- If a new submission has no title, the server uses the opening sentence as its display title.
- New submissions are saved as `published` immediately after the writer confirms publication consent.
- The public list endpoint returns published letter fields only. It never returns private email addresses.
- The database prevents publication without consent.

## Set up the database

1. Create a Supabase project and copy its project URL, publishable key, and secret key from the project API settings.
2. Apply `supabase/migrations/202611210001_create_letters.sql` in the Supabase SQL Editor.
3. Run `supabase/seed.sql` in the SQL Editor to load the 27 collected letters.

The secret key is only for the server functions. Do not put it in the website files.

## Deploy the backend functions

Install the Supabase CLI, then run these commands from this folder:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy list-letters
npx supabase functions deploy submit-letter
```

The functions read the Supabase project URL and secret key from Supabase's server-side environment. They prefer the default key in `SUPABASE_SECRET_KEYS`, with a legacy-key fallback. These values stay on the server and must never be added to this repository. The production GitHub Pages origin is allowed by default; set `ALLOWED_ORIGINS` only if you need to override it.

The functions have public entry points because visitors can submit without creating an account. They validate inputs, restrict browser origins, use a honeypot field, and publish new rows immediately after consent.

## Connect the website

Edit `site-config.js` and fill in only:

```js
window.FROM_US_TO_US_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "YOUR_PUBLISHABLE_KEY",
};
```

The publishable key is intended for browser use. Never put the secret key here. The site falls back to the included collected letters if the Supabase connection is unavailable.

Serve this folder from a local web server while developing; browser `file://` pages cannot reliably call the Supabase API. For example:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. For public use, host the folder on a static web host and add that exact HTTPS origin to `ALLOWED_ORIGINS` if you override the default.

## Manage public letters

Use the Supabase Dashboard **Table Editor → letters** to manage public letters:

1. Filter `status` to `published` to view public letters.
2. To remove a letter from the public archive, change `status` to `rejected`.

The public website reads only published letters. Email is not included in public responses. The database blocks publishing a row whose `consent_to_publish` value is false.

## Before inviting the public

Configure a spam challenge or rate limit for the public submission endpoint, decide how people can request a letter be removed, and add your final privacy/contact information. The current honeypot and input limits are basic protections, not a complete anti-spam system.
