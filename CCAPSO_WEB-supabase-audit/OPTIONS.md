# Fundraiser tracker: persistence and export options

## Recommendation

Use the split vanilla frontend with **Supabase as the shared database**, then keep a **JSON backup and CSV export** in the browser. This is the smallest setup that supports the real requirement: committee members can update the same records from different phones or computers, while the public page remains view-only.

Do not use `localStorage` as the main database. It is useful as a temporary offline cache, but each browser has its own copy. An update saved on one phone will not appear on another phone. The current “download the updated page and upload it again” approach works for a tiny event, but it creates multiple versions of the truth and becomes risky once several people edit the list.

## What the current prototype already does

The page has a sensible presentation layer, calculated totals, attendee editing, bulk entry, event settings, and a generated HTML download. It also already uses `localStorage` and an embedded state object. I split the prototype into four files:

- `index.html` contains the page structure.
- `styles.css` contains the styling.
- `data.js` contains the initial embedded data.
- `app.js` contains rendering, editing, local persistence, and page export logic.

The current PIN is not a real security boundary because it is shipped to every browser in JavaScript. Anyone who views the source can find it. It is acceptable only as a convenience lock for a low-risk prototype. It should not protect sensitive financial records.

## Persistence choices

| Option | Shared across devices | Setup | Best use | Main limitation |
|---|---:|---:|---|---|
| `localStorage` | No | None | One-person offline editing or a demo | Browser-specific; easy to lose; no access control |
| IndexedDB | No | Low | Larger offline data and reliable browser storage | Still belongs to one browser; export and sync are your responsibility |
| JSON file in the repository | Yes, after publishing | Low | Static public snapshot updated by one trusted person | Editing means replacing and republishing a file |
| Google Sheets + Apps Script | Yes | Medium | Committee that already uses Google accounts and wants spreadsheet exports | Security, validation, and API design need care |
| Supabase | Yes | Medium | A proper small multi-user tracker with authentication and database export | Requires database rules and a small backend integration |
| Firebase | Yes | Medium | A real-time app already using Google Firebase | More platform-specific and usually more setup than needed here |

### Option 1: `localStorage`

This is already implemented. It is the fastest option and costs nothing, but it should be described accurately as **device-local persistence**, not shared persistence. Use it as a fallback cache even after adding a server database.

### Option 2: a JSON file

Store the event state in `data.json` and load it with `fetch()`. The committee edits the data through a small admin tool, downloads the new JSON, and replaces the hosted file. This is simple and transparent, but it is still a manual publishing workflow.

A JSON file is a reasonable first release if only one person updates the tracker. It is better than embedding a large state object in `index.html` because data changes no longer modify the page source.

### Option 3: Google Sheets

Use one sheet for attendees and another for event settings. A Google Apps Script web app can expose read and write endpoints. The frontend can read the public view and the committee can use a protected edit endpoint. Google Sheets then becomes the natural backup and export location.

This is attractive for a student committee because everyone may already know spreadsheets. Do not publish the sheet directly with edit access. Put validation and authorization in Apps Script, and avoid exposing private payment details to the public endpoint.

### Option 4: Supabase

Use Supabase Auth for committee login and Postgres tables for `events`, `attendees`, and `payments`. Enable Row Level Security so the public can read only the fields intended for public display, while authenticated committee users can create and update records. Supabase can export query results as CSV, and the frontend can also generate a client-side CSV for convenience.

This is my preferred option if the tracker will be reused for future events. It gives you a clean path to audit history, multiple committee users, and a proper admin interface without abandoning vanilla JavaScript.

## Export choices

Implement all three exports because they serve different purposes.

### CSV for Excel and Google Sheets

Export one row per attendee with these columns:

```text
Name,Fee,Amount Paid,Balance,Status,Updated At
```

CSV is the best everyday export. Escape quotes, commas, and line breaks correctly. Prefix the downloaded file with the event name and date, for example `must-ccapso-2026-attendees.csv`.

### JSON backup and restore

Export the complete application state, including settings and attendees, as a JSON file. Add an **Import backup** action that validates the structure before replacing the current state. Always ask for confirmation before overwriting existing records through an import.

JSON is the best disaster-recovery format because it preserves the full structure and can be restored without relying on a spreadsheet.

### Printable report

Add a print stylesheet and a “Print report” button. The report should show the event details, totals, attendee table, and a generated timestamp. This is useful for committee meetings and physical record keeping. It does not replace CSV or JSON backups.

## Suggested data model

Keep the data separated from the page markup. A shared database should use stable IDs rather than attendee names as identifiers.

```text
events
  id
  title
  deadline
  dates
  venue
  fee
  registration_fee

attendees
  id
  event_id
  name
  amount_paid
  updated_at

payments
  id
  event_id
  method_name
  details
  is_public
```

For stronger accountability, add a `payment_transactions` table instead of storing only a running total on each attendee. Each payment can then have an amount, date, method, reference, and person who recorded it. The balance becomes a calculation, and mistakes are easier to audit.

## Important fixes before publishing

The frontend currently renders some values directly into HTML. Continue using `escapeHtml()` for every user-entered string, including event title, venue, dates, and payment details. Escaping attendee and payment values alone is not enough.

Move the administrator PIN out of the frontend as soon as the page is shared publicly. A client-side PIN can hide buttons, but it cannot provide authentication. Use Supabase Auth, Firebase Auth, or a server-side session for real committee access.

Do not place private payment account details in a public page unless the committee explicitly wants them public. A public read endpoint should expose only the information needed by donors.

Keep `localStorage` as a fallback, but add a visible last-saved time and a backup button. If the database is unavailable, show that the change is local and has not been shared with other devices.

## Practical rollout

Start with the split files and the existing local fallback. Add CSV, JSON backup, JSON restore, and print support first. Those features give immediate value and are easy to test.

If one person is responsible for updates, use a hosted JSON file or Google Sheets next. If multiple committee members need to update records, use Supabase rather than trying to make a static HTML file behave like a database.

The clean target architecture is therefore:

```text
index.html + styles.css + app.js
                 |
       localStorage fallback
                 |
       Supabase shared database
                 |
       CSV / JSON / print exports
```

## References

[1]: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage "MDN localStorage API"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API "MDN IndexedDB API"
[3]: https://supabase.com/docs/guides/database/overview "Supabase database documentation"
[4]: https://supabase.com/docs/guides/auth "Supabase Auth documentation"
[5]: https://developers.google.com/apps-script/guides/web "Google Apps Script web apps documentation"
[6]: https://developer.mozilla.org/en-US/docs/Web/API/Blob "MDN Blob API"
[7]: https://developer.mozilla.org/en-US/docs/Web/API/Window/print "MDN print API"
