# MP Basketball

Practice booking for Midland Park basketball. Coaches reserve gyms by day and time. Admins manage the roster, lock floors for games, and watch who is taking more than their share of hardwood.

## What you can do

- **Coaches** sign in, scan the week or month board, and book 60-minute practices between 6:00 AM and 10:00 PM.
- **Conflict prevention** refuses a booking if that gym is already reserved or blocked. The same slot cannot be double booked.
- **Games & holds** show as green (games) or indigo (events) and cannot be booked over.
- **Closed days** (school closed, holiday, building event) show as black on the week and month boards. Coaches cannot book them.
- **Teams** tag each practice (Varsity, JV, freshman, rec). A coach can run more than one team.
- **Monopoly monitoring** totals hours **per team** over a rolling window (default 14 days). Crossing **10 hours** or **35% of all booked time** for that team sends an in-app alert. Two teams on one coach do not combine into one monopoly.
- **Admins** set the hours coaches may request on each gym, block specific times, add or retire gyms, create users, deactivate accounts, reset passwords, edit any booking, and change the thresholds.
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

Seeded gyms: **Godwin**, **Highland 1**, **Highland 2**, **MP High School 1**, **MP High School 2**, **Eastern Christian**, **The Barn**.

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

1. Set or generate a temporary password. Adding them also sends a welcome email with the sign-in link and that temporary password.
2. They sign in with that password and are sent to **Choose a new password**. They cannot open the schedule until they finish.
3. If they forget later, an admin uses **Reset password** on their card. That issues another temporary password and forces the same change-on-next-login step.

The welcome email uses `AUTH_URL` for the site link. Without `RESEND_API_KEY`, the letter is logged under **Games & closed days → Sent mail**.

## Run on Proxmox behind Cloudflare (`www.datosfarm.com`)

The app runs in Docker on an Ubuntu VM in Proxmox. SQLite stays on that disk, so bookings survive restarts. A Cloudflare Tunnel reaches the VM **without opening port 80 or 443** on your router.

**If `www.datosfarm.com` already serves another site, this will replace it.** Use `gym.datosfarm.com` instead if you want both.

### 0. Domain on Cloudflare

`datosfarm.com` must already be a site in Cloudflare (nameservers at the registrar point to Cloudflare). If that is not done yet: Cloudflare dashboard → **Add a site** → follow the nameserver change at GoDaddy / Namecheap / whoever sold you the domain. Wait until the domain shows **Active**.

### 1. Make a VM in Proxmox

Create an **Ubuntu 24.04** VM: 2 vCPU, 4 GB RAM, 32 GB disk, give it a LAN IP you can SSH to.

On the VM:

```bash
sudo apt update && sudo apt install -y ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in (or reboot the VM) so `docker` works without sudo. Check with `docker ps`.

### 2. Copy this project onto the VM

Put the whole project folder at `/opt/mp-basketball`. From Windows, WinSCP is the easiest: connect to the VM’s LAN IP, upload the folder. From a Mac/Linux terminal:

```bash
scp -r /path/to/this-project ubuntu@VM-LAN-IP:/opt/mp-basketball
```

Then on the VM:

```bash
cd /opt/mp-basketball
cp .env.example .env
nano .env
```

Set these four lines (leave the rest as-is):

```bash
AUTH_SECRET="paste-output-of-openssl-rand-base64-32"
AUTH_URL="https://www.datosfarm.com"
CLOUDFLARE_TUNNEL_TOKEN="paste-from-step-3"
ADMIN_PASSWORD="choose-a-strong-password"
```

Make the secret on the VM with `openssl rand -base64 32`. `ADMIN_PASSWORD` is only used the first time the database is empty (login username is `admin`). After that, change it from inside the app.

### 3. Cloudflare Tunnel (this is what points the domain at the VM)

1. Open [Cloudflare Zero Trust](https://one.dash.cloudflare.com) → **Networks** → **Tunnels** → **Create a tunnel**.
2. Choose **Cloudflared**. Name it e.g. `mp-basketball`.
3. Copy the **token** into `CLOUDFLARE_TUNNEL_TOKEN` in `.env` on the VM.
4. Add a public hostname:
   - Subdomain: `www`
   - Domain: `datosfarm.com`
   - Type: HTTP
   - URL: `localhost:43147`  
     (Older Cloudflare screens say **Service:** `http://localhost:43147`. It must be localhost — the tunnel container shares the app’s network.)
5. Optional: add a second public hostname with the subdomain **blank** so `https://datosfarm.com` works too. Same URL: `localhost:43147`.
6. In Cloudflare **DNS**, `www` should show as proxied (orange cloud). Cloudflare creates this when you add the public hostname.
7. In Cloudflare **SSL/TLS** → Overview, set encryption mode to **Full** (not Flexible, not Full Strict). Turn on **Always Use HTTPS**.

### 4. Start the app

```bash
cd /opt/mp-basketball
docker compose up -d --build
docker compose logs -f
```

When it is healthy, open **https://www.datosfarm.com**. Sign in as `admin` with the `ADMIN_PASSWORD` you set. You will be asked to choose a new password.

Gyms and teams are created automatically on first boot. Add coaches under **People**. Do not run `npm run db:setup` on the server — that wipes bookings and loads demo accounts.

To update later: copy the new files onto the VM, then `docker compose up -d --build`.

Useful checks:

```bash
docker compose ps
docker compose logs app --tail 80
docker compose logs tunnel --tail 80
```

## Defaults we chose

- Slot model: 30-minute start times, 60-minute practices, 6:00 AM–10:00 PM.
- Monopoly window: rolling 14 days, 10 hours **or** 35% of booked time.
- Storage: SQLite via Prisma so a single command is enough. Auth is email/password through Auth.js.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Prisma, SQLite, Auth.js.
