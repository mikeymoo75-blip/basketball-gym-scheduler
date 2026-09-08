# MP Basketball

Practice booking for Midland Park basketball. Coaches reserve gyms by day and time. Admins manage the roster, lock floors for games, and watch who is taking more than their share of hardwood.

## What you can do

- **Coaches** sign in, scan the week or month board, and book 60-minute practices between 6:00 AM and 10:00 PM.
- **Conflict prevention** refuses a booking if that gym is already reserved or blocked. The same slot cannot be double booked.
- **Games & holds** show as green (games) or indigo (events) and cannot be booked over.
- **School hours** on the 2026–2027 Midland Park calendar block Godwin, Highland, and the high school gyms from 6:00 AM to 5:00 PM on student days. Evenings and days off stay open.
- **Closed days** (school closed, holiday, building event) show as gray on the week and month boards. Blocked hours are grayed out too. Coaches cannot book them.
- **Teams** tag each practice (Varsity, JV, freshman, rec). A coach can run more than one team.
- **Monopoly monitoring** totals hours **per team** over a rolling window (default 14 days). Crossing **10 hours** or **35% of all booked time** for that team sends an in-app alert. Two teams on one coach do not combine into one monopoly.
- **Admins** set the hours coaches may request on each gym, block specific times, add or retire gyms, create users, **Resend** or **Reset** a password by email, **Remove** a coach from People (they cannot sign in; their practices leave the board), edit any booking, and change the thresholds. Promoting someone to admin also makes them a coach: assign the teams they run, and they book practice only for those teams.
- **Cancellation notices** go to the coach in the app and by email only when an admin cancels their practice or drops a game/hold on that slot. A coach cancelling their own practice does not send an email.
- **Temporary passwords** are set when you add a person (or reset their password). On first sign-in they must choose a new password before they can open the schedule.

## Run it locally

You need Node.js 20+.

```bash
cp .env.example .env
npm run setup
npm run dev
```

The app listens on [http://127.0.0.1:43147](http://127.0.0.1:43147).

`npm run setup` installs dependencies and creates an empty SQLite database with one admin login. To wipe local data later:

```bash
npm run db:setup
```

## First login

| Role  | Username | Password     |
| ----- | -------- | ------------ |
| Admin | `admin`  | `MPtravel1!` |

This admin login is built-in. Every time the app starts it is created or restored from `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). You can always sign in with those values. You cannot remove that account from People. To change the password, edit `ADMIN_PASSWORD` in `.env` and run `sudo docker compose up -d --build`.

Gyms are already listed (Godwin, Highland 1 and 2, MP High School 1 and 2, Eastern Christian, The Barn). Teams and coaches start empty — add them under **Teams** and **People**.

Admins always receive monopoly alerts. You can add extra recipients under **Thresholds** or on a person’s record.

## Cancellation emails

When an admin cancels a practice, or blocks that gym for a game or other function, the coach gets:

1. An in-app notification on **Notifications**.
2. An email that says their practice on that date and time has been cancelled due to a game or other function.

Set `RESEND_API_KEY` and `EMAIL_FROM` to deliver mail for real. Without those, the same letter is logged under **Sent Emails** so you can still see what went out.

## Temporary passwords

When you add a coach (or reset someone’s password) from **People**:

1. Set or generate a temporary password. Adding them also sends a welcome email with the sign-in link and that temporary password.
2. They sign in with that password and are sent to **Choose a new password**. They cannot open the schedule until they finish.
3. If they never signed in, that button says **Resend**. It emails a new temporary password and the sign-in link. The old temporary password stops working.
4. After they have chosen a password, the same button says **Reset**. It emails a new temporary password. Their current password stops working, and they must choose a new one the next time they sign in.
5. To take someone off the roster, use **Remove** on their card. They cannot sign in after that, and their booked practices are deleted. You cannot remove your own account or the last admin.

The welcome email uses `AUTH_URL` for the site link. Without `RESEND_API_KEY`, the letter is logged under **Sent Emails**.

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

### 2. Copy this project onto the VM

The VM is empty until you copy **this whole app** into `/opt/mp-basketball`. Creating that folder and editing `.env` is not enough — you need `Dockerfile`, `docker-compose.yml`, `package.json`, and the `src` folder.

You do **not** need a GitHub **Create repo** button. That control lives in Cursor on your computer (not on the Proxmox VM) and is easy to miss. Use WinSCP instead.

1. On your Windows PC, download `mp-basketball.zip` from this Cursor chat (the download page / attached zip).
2. Right-click → **Extract All**. Open the unzipped folder. You should see `Dockerfile`, `docker-compose.yml`, and `package.json`.
3. Install [WinSCP](https://winscp.net/).
4. In Proxmox, note the VM’s LAN IP (VM → **Summary**).
5. WinSCP **New Session**: File protocol `SFTP`, Host name = that IP, Port `22`, User name = the Ubuntu login you created, then **Login**.
6. **View → Show hidden files**.
7. Right side: go to `/opt`. Create `mp-basketball` if needed (F7). Open it. Drag **everything inside** the unzipped folder onto the right side.

From a Mac/Linux terminal instead of WinSCP:

```bash
scp -r /path/to/this-project ubuntu@VM-LAN-IP:/opt/mp-basketball
```

If you later create a GitHub repository yourself, you can also `git clone` that URL into `/opt/mp-basketball`. That is optional.

First confirm the project actually landed:

```bash
ls /opt/mp-basketball
```

You should see `Dockerfile`, `docker-compose.yml`, `package.json`, and `env.production.example`. If those are missing, copy the whole project folder again, then come back here.

Create `.env` on the VM (this writes the file — you do not need nano):

```bash
cd /opt/mp-basketball
cp env.production.example .env
```

Or paste this whole block. It fills in `AUTH_SECRET` for you. Replace the token and password, then press Enter:

```bash
cd /opt/mp-basketball
cat > .env << EOF
DATABASE_URL="file:./dev.db"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="https://www.datosfarm.com"
EMAIL_FROM="MP Basketball <noreply@datosfarm.com>"
RESEND_API_KEY=""
CLOUDFLARE_TUNNEL_TOKEN="PASTE_TOKEN_FROM_CLOUDFLARE"
ADMIN_USERNAME=admin
ADMIN_PASSWORD="choose-a-strong-password"
EOF
```

`ADMIN_USERNAME` and `ADMIN_PASSWORD` are the built-in admin login. They are restored every time the app starts. Check the file with `cat .env` — it should not be empty.

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
5. Add a **second** public hostname so the bare domain is not IONOS:
   - Subdomain: leave **blank**
   - Domain: `datosfarm.com`
   - Type: HTTP
   - URL: `localhost:43147`
6. In Cloudflare **DNS**, `www` and the apex `datosfarm.com` should show as proxied (orange cloud). Leave MX / mail records alone.
7. In Cloudflare **SSL/TLS** → Overview, set encryption mode to **Full** (not Flexible). Then **SSL/TLS** → **Edge Certificates** → turn **Always Use HTTPS** on.
8. In Cloudflare **Rules** → **Redirect Rules**, keep **Redirect from root to WWW** (or add one): `datosfarm.com` → `https://www.datosfarm.com`. Apply it to **All incoming requests**, not HTTPS only.

The only address coaches should use is **https://www.datosfarm.com**. Login cookies do not work on `http://datosfarm.com` (that is still an IONOS page) or if the browser switches between www and the bare domain.

### 4. Start the app

```bash
cd /opt/mp-basketball
docker compose up -d --build
docker compose logs -f
```

When it is healthy, open **https://www.datosfarm.com**. Sign in as `admin` with the `ADMIN_PASSWORD` you set. You will not be asked to change it.

First boot creates the admin login from `.env` and the Midland Park gyms. Teams and coaches are empty until you add them. Do not run `npm run db:setup` on the server unless you intend to wipe the board.

### 5. Push an update later

Ask in Cursor chat for the change. After the files are ready, copy them onto the VM and rebuild. **Do not overwrite `.env`.** Bookings live in the Docker volume `gym-data`, so a rebuild does not wipe the schedule.

**With WinSCP (what you used for the first copy):**

1. Unzip the new files on your PC.
2. Connect to the VM and open `/opt/mp-basketball`.
3. Drag the new files in. Overwrite `src`, `Dockerfile`, `docker-compose.yml`, `package.json`, and so on. Skip `.env` if WinSCP asks.
4. On Ubuntu:

```bash
cd /opt/mp-basketball
sudo docker compose up -d --build
```

**With Git (easier once you have a GitHub repo):**

Create a GitHub repository from Cursor (**Create repo**), then on the VM once:

```bash
cd /opt/mp-basketball
git remote -v
```

If that folder is not a git checkout, clone into a temp dir and copy files over, still keeping `.env`. After that, each update is:

```bash
cd /opt/mp-basketball
git pull
sudo docker compose up -d --build
```

Sign-out must send you to `https://www.datosfarm.com/login`, never `0.0.0.0`. Keep `AUTH_URL="https://www.datosfarm.com"` in `.env`.

If `www.datosfarm.com` drops you on `datosfarm.com` and login fails: open a private window to `https://www.datosfarm.com/login`, then fix Cloudflare as in step 3 (Always Use HTTPS, apex hostname on the tunnel, Redirect to WWW). Do not bookmark `datosfarm.com` without www.

Useful checks:

```bash
docker compose ps
docker compose logs app --tail 80
docker compose logs tunnel --tail 80
```

## Defaults we chose

- Slot model: practices start on the hour, last 60 minutes, 6:00 AM–10:00 PM.
- Monopoly window: rolling 14 days, 10 hours **or** 35% of booked time.
- Storage: SQLite via Prisma so a single command is enough. Auth is email/password through Auth.js.

## Stack

Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Prisma, SQLite, Auth.js.
