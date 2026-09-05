# MP Basketball

Practice booking for Midland Park basketball. Coaches reserve gyms by day and time. Admins manage the roster, lock floors for games, and watch who is taking more than their share of hardwood.

## What you can do

- **Coaches** sign in, scan the week or month board, and book 60-minute practices between 6:00 AM and 10:00 PM.
- **Conflict prevention** refuses a booking if that gym is already reserved or blocked.
- **Games & holds** show as green (games) or indigo (events) and cannot be booked over.
- **Closed days** (school closed, holiday, building event) show as black on the week and month boards. Coaches cannot book them.
- **Monopoly monitoring** totals each coach’s hours over a rolling window (default 14 days). Crossing **10 hours** or **35% of all booked time** sends an in-app alert to every admin and any designated recipients.
- **Admins** add or retire gyms, create users, deactivate accounts, reset passwords, edit any booking, and change the thresholds.
- **Cancellation notices** go to the coach in the app and by email when an admin cancels their practice or drops a game/hold on that slot.
- **Temporary passwords** are set when you add a person (or reset their password). On first sign-in they must choose a new password before they can open the schedule.

## Run it locally

You need Node.js 20+.

```bash
cp .env.example .env
npm run setup
npm run dev
```

The app listens on [http://127.0.0.1:43147](http://127.0.0.1:43147).

`npm run setup` installs dependencies, creates the SQLite database, and loads seed data. To reset the board later:

```bash
npm run db:setup
```

## Seed accounts

| Role  | Name         | Username / email              | Password           |
| ----- | ------------ | ----------------------------- | ------------------ |
| Admin | Jordan Hale  | `admin`                       | `MPtravel1!`       |
| Admin | Pat Nguyen   | `pat.nguyen@courtline.local`  | `CourtlineAdmin1!` |
| Coach | Marcus Reid  | `marcus.reid@courtline.local` | `CoachPass1!`      |
| Coach | Aisha Cole   | `aisha.cole@courtline.local`  | `CoachPass1!`      |
| Coach | Jen Park     | `jen.park@courtline.local`    | `CoachPass1!`      |
| Coach | Devon Hale   | `devon.hale@courtline.local`  | `CoachPass1!`      |

Seeded gyms: **Godwin**, **Highland 1**, **Highland 2**, **MP High School 1**, **MP High School 2**, **Eastern Christian**.

The seed also books a couple of weeks of practices and three holds (a Friday varsity game at Godwin, a Saturday JV tournament at Highland 1, and district playoffs at MP High School 1).

## Demo monopoly alerts

1. Sign in as `admin`.
2. Open **Notifications** — Devon Hale already sits over the 10-hour / 35% line, so a monopoly alert is waiting.
3. Open **Usage board** to see hours and share by coach. Devon’s bar is marked over the limit.
4. To fire a **new** live alert:
   - Go to **Thresholds** and drop the hours cap to `6`.
   - Sign out, sign in as `devon.hale@courtline.local`, and book one more practice on an open court.
   - Sign back in as admin. A fresh monopoly notification appears (alerts for the same coach are coalesced for 12 hours so the inbox does not flood).

You can also designate extra recipients under **Thresholds** or on a person’s record. Admins always receive monopoly alerts.

## Cancellation emails

When an admin cancels a practice, or blocks that gym for a game or other function, the coach gets:

1. An in-app notification on **Notifications**.
2. An email that says their practice on that date and time has been cancelled due to a game or other function.

Set `RESEND_API_KEY` and `EMAIL_FROM` to deliver mail for real. Without those, the same letter is logged under **Games & holds → Cancellation emails** so you can still see what went out.

## Temporary passwords

Seeded accounts above already have lasting passwords and will not be asked to change them.

When you add a coach (or reset someone’s password) from **People**:

1. Set or generate a temporary password and share it with them.
2. They sign in with that password and are sent to **Choose a new password**. They cannot open the schedule until they finish.
3. If they forget later, an admin uses **Reset password** on their card. That issues another temporary password and forces the same change-on-next-login step.

## Defaults we chose

- Slot model: 30-minute start times, 60-minute practices, 6:00 AM–10:00 PM.
- Monopoly window: rolling 14 days, 10 hours **or** 35% of booked time.
- Storage: SQLite via Prisma so a single command is enough. Auth is email/password through Auth.js.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Prisma, SQLite, Auth.js.
