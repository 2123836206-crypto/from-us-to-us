# From Us, To Us

This is a static website with a Supabase database backend. It keeps the current Framer-style layout and simple navigation, archive list, letter detail pages, and one submission form. It is not connected to a live Supabase project until you complete the setup below.

## What works in the site code

- The 27 collected entries are in `data/letters.json` and `supabase/seed.sql`.
- Missing programmes in the collected data are stored as `Unknown`; unknown cohort years are left blank.
- Existing letters are seeded as published, as requested. Their titles are editorial labels because the source document did not include titles.
- A new submission only requires the letter text. Name, title, email, programme, cohort, theme, and publication consent are optional.
- If a new submission has no title, the server uses the opening sentence as its display title.
- New submissions are always saved as `pending`. They do not appear in the public archive until reviewed.
- The public list endpoint returns published letter fields only. It never returns private email addresses.
- If someone submits without publication consent, an administrator must obtain consent before publishing. The database enforces this.

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

Set the function secrets in the Supabase Dashboard under **Edge Functions → Secrets**:

- `DATABASE_API_KEY`: the Supabase secret key for this project
- `ALLOWED_ORIGINS`: your published website origin, for example `https://your-site.example`; include `http://localhost:8000` while developing locally

The code uses Supabase Edge Functions so the database secret stays on the server. The functions have public entry points because visitors can submit without creating an account; they validate inputs, restrict browser origins, use a honeypot field, and write new rows as pending.

## Connect the website

Edit `site-config.js` and fill in only:

```js
window.FROM_US_TO_US_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "YOUR_PUBLISHABLE_KEY",
};
```

The publishable key is intended for browser use. Never put the secret key here. The site falls back to the included collected letters when the Supabase settings are blank, and it clearly reports that submissions are not connected.

Serve this folder from a local web server while developing; browser `file://` pages cannot reliably call the Supabase API. For example:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. For public use, host the folder on a static web host and add that exact HTTPS origin to `ALLOWED_ORIGINS`.

## Review submissions

Use the Supabase Dashboard **Table Editor → letters** as the initial moderation queue:

1. Filter `status` to `pending`.
2. Review the letter and any optional contact details.
3. Set `status` to `published` only when publication consent is true. Otherwise, leave it pending or set it to `rejected`.

The public website reads only published letters. Email is not included in public responses. The database blocks an administrator from publishing a row whose `consent_to_publish` value is false.

## Before inviting the public

Configure a spam challenge or rate limit for the public submission endpoint, decide how people can request a letter be removed, and add your final privacy/contact information. The current honeypot and input limits are basic protections, not a complete anti-spam system.
