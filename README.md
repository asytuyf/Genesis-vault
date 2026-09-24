# GENESIS_VAULT 🗄️

> **SYSTEM_STATUS:** ONLINE  
> **SECURITY_LEVEL:** VERIFIED  

A high-fidelity, industrial-themed directory for my personal projects. It features a kinetic hazard frame, draggable holographic stickers, and a live data uplink that fetches repository data directly from GitHub.

## 🚧 System Modules
*   **Kinetic Frame:** Continuous "MEN AT WORK" hazard marquee wrapping the screen.
*   **Holographic Stickers:** Draggable 3D assets with chromatic aberration and physics.
*   **Live Uplink:** Dynamically fetches and filters repositories via the GitHub API.
*   **Terminal UI:** High-contrast data tables with color-coded tech stacks (Cyan/Lime/Indigo).

## 🛠️ Tech Stack
*   **Core:** Next.js 15 (App Router)
*   **Styling:** Tailwind CSS
*   **Physics:** Framer Motion
*   **Icons:** Lucide React & Simple Icons

## ⚡ Local Initialization
```bash
npm install
npm run dev
```

## 🔔 Sub-task Reminders
Sub-tasks with a deadline send a push notification, titled with the goal's name, to every device that turned reminders on. The app can be closed when they arrive.

*   **Per goal:** open a goal → **Info** → *Sub-task reminders*. Pick when (at due, 10m, 30m, 1h, 3h, 1d, 2d, or any custom time), or set the goal to *Silent*. The default is 1h before and at due time.
*   **Per device:** same tab → *Notifications on this device* → **Turn on**. On iPhone, add the site to the Home Screen first and open it from there (iOS 16.4+).

One-time setup:

1.  Generate keys: `npx web-push generate-vapid-keys`
2.  Add environment variables in Vercel:
    *   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`: from step 1
    *   `VAPID_SUBJECT`: `mailto:you@example.com` or the site's `https://` URL
    *   `CRON_SECRET`: any long random string
3.  Have something call `GET /api/reminders` every 5 minutes with the header `Authorization: Bearer <CRON_SECRET>`, or with `?key=<CRON_SECRET>` in the URL. The Vercel Hobby plan only allows daily crons, so use a free scheduler such as [cron-job.org](https://cron-job.org) or Upstash QStash. On Vercel Pro, a `vercel.json` cron with `"schedule": "*/5 * * * *"` works too; Vercel sends the header by itself.

Each reminder is sent once. A tab that is open on a device without push still shows reminders while it stays open.

---
*Genesis Vault Storage Unit 01 // Authorized Personnel Only*
