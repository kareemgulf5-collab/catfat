# EgyGulf Foods — Catalog + Invoices

Static site (no build step) + Firebase (Auth + Firestore).

- **Public:** product catalog, price list, export markets, about.
- **Staff (sign in):** commercial invoices — pick products from the catalog, auto-numbered `EGF-YYYY-0001`, print / PDF.
- **Admin:** sees every invoice, adds users, sets roles, disables accounts.

## Files (all in one folder)
```
index.html            app shell
style.css             all styles (catalog + app + printable invoice)
data.js               BRANDS — products, flavours, packing rows, prices  ← edit prices here
app.js                catalog views, router, translations (TR), header/account
auth.js               Firebase Auth + user profiles
invoices.js           invoices list, editor, printable invoice, users page
container.js          container load planning (20ft / 40ft)
firebase-config.js    Firebase project config
firestore.rules       security rules — paste into Firebase Console
*.webp                product images
```

## One-time Firebase setup
1. **Authentication → Sign-in method →** enable **Email/Password**.
2. **Authentication → Users → Add user:** `admin@egygulf.app` + a strong password.
   This is the first admin; sign in on the site with username **admin**.
3. **Firestore Database → Create database** (production mode).
4. **Firestore Database → Rules →** paste `firestore.rules` → **Publish**.
5. **Authentication → Settings → Authorized domains →** add your Vercel domain
   (e.g. `egygulf-catalog.vercel.app`) and any custom domain.

## Deploy (GitHub → Vercel)
Push this folder to a GitHub repo → Vercel → **Add New Project** → import the repo →
Framework preset **Other**, no build command, output directory = root → Deploy.

## Notes
- Usernames map to internal e-mails `<username>@egygulf.app`; users never see them.
- A forgotten password can't be reset from the site (that needs a server). The admin
  disables the old account and creates a new one; users change their own password
  from the account menu.
- Firestore data: `users/{uid}`, `invoices/{EGF-YYYY-NNNN}`, `counters/{year}`.

## Container planning
Each invoice picks **20ft / 40ft / no container** and **how many containers**.
- Capacity per line = cartons per 40ft from the price list (`ft` in `data.js`); 20ft is derived from it
  by the carton's geometric 20/40 ratio. Lines without that figure are computed from the carton size
  with tolerances (carton +1 cm per side for bulging; container −5 cm per side for rails / doors).
- A **safety margin** (default 5%, per invoice) is taken off every capacity.
- Fill % = Σ (qty ÷ usable capacity) ÷ containers. Buttons: *fit all quantities to the containers*,
  *fill the remaining space with this product*. Saving above 100% asks for confirmation.
- Tune `TOL` and `DEFAULT_MARGIN` in `container.js`.
