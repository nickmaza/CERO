# CERO

Household payroll for Guatemala. Families track their domestic worker's pay and get the legal amounts for Bono 14, aguinaldo, vacations and severance. The worker connects with a code to see her payments and confirm she received them.

One Expo app runs on iPhone, Android and the web. Data lives in the Supabase project **cero** (`ktewnuqxaogoiefriano`).

## Run it

```bash
npm install
npx expo install --fix   # aligns package versions with Expo SDK 58
npx expo start           # scan the QR code with Expo Go on your phone
```

`npm run web` opens it in the browser. `npm test` runs the pay-calculation tests and `npm run typecheck` checks types.

The `.env` file holds the Supabase URL and publishable key. That key is meant to ship in the app; the database's row-level security decides what each person can see. Copy `.env.example` to `.env` if it's missing.

## Before real users

- **Email confirmation.** Supabase sends a confirmation link at sign-up. In the dashboard, under Authentication → URL Configuration, set the Site URL to your website, so the link doesn't land on `localhost`. To test quickly, you can turn off "Confirm email" under Authentication → Providers → Email.
- **Have a Guatemalan accountant check `src/lib/pay.ts`.** Each rule cites its law. The severance base uses salary × 14/12 (one twelfth each of aguinaldo and Bono 14); some practitioners use one sixth instead, so confirm which to apply.
- **Update the minimum wage each January** in `MINIMUM_WAGE_2026` once the new government agreement is published.

## Look and feel

Soft warm palette (cream, terracotta, honey, sage) and Times New Roman, all defined at the top of `src/components/ui.tsx`. Android phones don't include Times New Roman, so they show Android's built-in serif font instead. Buttons and cards shrink slightly and vibrate softly when tapped, screens fade in, and a short message confirms each saved action.

## Phone and computer

Phones and the web share the same screens and features. In a computer's browser (windows 900 px or wider) the app switches to a desktop layout: a side menu, two columns on the main screens, cards in a grid, and a split brand panel on sign-in. Narrow browser windows use the phone layout. The switch lives in `src/lib/useLayout.ts`; the building blocks are `Columns` and `Grid` in `ui.tsx`, `Sidebar.tsx` and `AuthShell.tsx`.

## How it's built

| Part | Where |
| --- | --- |
| Screens (Expo Router) | `src/app/` — `(auth)` sign-up and sign-in, `(employer)` the family's screens, `(worker)` the worker's screen |
| Guatemala pay rules + tests | `src/lib/pay.ts`, `src/lib/pay.test.ts` |
| Supabase client and session | `src/lib/supabase.ts`, `src/lib/auth.tsx` |
| Database schema, security rules | `supabase/migrations/` |

### Database

- `profiles`: one per account, with role `employer` or `worker`, created automatically at sign-up.
- `employments`: a family's worker, salary, start date, zone and a 6-character invite code.
- `payments`: each payment (salary, Bono 14, aguinaldo, vacations, severance), plus whether the worker confirmed it.

Security rules, tested against the live database with simulated users:

- Families see and edit only their own workers and payments.
- A worker sees only the jobs she connected with a code, and can't edit them.
- Only the worker can confirm a payment, and a confirmed payment can't be changed afterwards.
- No one can change their own role, and signed-out visitors see nothing.
