# Setup Guide

The friendly, no-experience-needed version. Most people finish in a few minutes,
without ever typing a command.

---

## Step 1 — Download the app

On the GitHub page, click the green **Code → Download ZIP** button, then **unzip**
the file somewhere easy to find, like your Desktop.

---

## Step 2 — Start it (one double-click)

- **Windows:** open the folder and **double-click `start.bat`**.
- **Mac:** **double-click `start-mac.command`**. (The very first time, if Mac warns
  about an "unidentified developer," right-click the file → **Open** → **Open**.)
- **Linux:** run `./start.sh` in a terminal.

That's it. The first run sets everything up and then your browser opens at
**http://localhost:3000** — that's the app.

> **If it says Node.js is needed:** Node.js is the free engine the app runs on.
> On Windows, `start.bat` tries to install it for you automatically (click "Yes"
> on the popup, then double-click `start.bat` again). Otherwise it opens the
> download page — install the big green **LTS** button and start the app again.

**To stop:** close the black window. **To reopen later:** double-click the start file again.

⚠️ Came across an error? See **[Troubleshooting](#Troubleshooting)**.

---

## Step 3 — Use it

- **+ Add Application** — add a job. Fill in as much or as little as you like; only
  **Company** is required.
- Click a job's **status pill** to move it between stages (Applied, Interview, …).
- Click the **stat cards** up top to filter by stage.
- Row buttons: **edit ( ✎ )**, **archive ( ⊙ )**, or **remove ( 🗑 )**. Removing asks
  first and lets you **archive instead** — so you can't delete something by accident.

Everything saves automatically to `data/applications.json` inside the app folder.

---

## Step 4 (optional) — Turn on AI auto-fill, free, no terminal

This lets you paste a job link and have the details filled in automatically.

1. Install **Ollama** from **https://ollama.com** (free, open-source). Just run the installer.
2. In the app, open **⚙ Settings → AI Extraction** and choose **Ollama**.
3. The app checks for Ollama and walks you through it:
   - If it's not detected yet, click **Check again** after installing.
   - When it says "Ollama is running," click **⬇ Download the model** (a one-time ~2 GB
     download; click **Check again** when it finishes).
   - When you see **"Ready,"** click **Save settings**. Done!

Now the ✦ **Extract** button fills jobs in for you — and nothing you paste ever
leaves your computer.

> **Prefer your own cloud key?** In the same screen you can pick **OpenAI / OpenRouter /
> Anthropic** and paste a key instead. OpenRouter even has free models (base URL
> `https://openrouter.ai/api/v1`, a model ending in `:free`).
>
> **No AI at all?** Totally fine — leave it on **None** and type job details yourself.
>
> ⚠️ Extraction can't read LinkedIn / Indeed / Glassdoor (they block bots). Use the
> direct company application link (Greenhouse, Lever, Ashby, Workday…) and it usually works.

---

## Step 5 (optional) — Import an existing Google Sheet

Already tracking jobs in a Google Sheet? Bring it in once:

1. In **Google Sheets**: **Share → General access → "Anyone with the link" → Viewer**.
2. Copy the sheet's URL from your browser.
3. In the app: **⚙ Settings → Import / Export**, paste the link, click **Preview & map columns**.
4. The app shows each of your columns with its best-guess destination and a sample of
   the data. **Your column names don't have to match** — for anything it didn't recognize,
   pick a field, choose **➕ Create new field**, or **🚫 Ignore**. Nothing is imported
   until you click **Import**, so nothing gets lost or misplaced.

After importing, your sheet and the app are independent — edits in one don't affect the other.

---

## Choosing your own fields

**⚙ Settings → Fields** lets you:
- **Track** — turn a field on/off (e.g. hide Salary).
- **In table** — show/hide it as a column.
- **Add a custom field** — type a name (like "Referral" or "Deadline") → **+ Add field**.

Only **Company** is required; everything else is yours to shape.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Browser didn't open | Go to **http://localhost:3000** manually. |
| "Node.js is needed" keeps showing | After installing Node, fully close the window and start again (it needs a fresh window to see Node). |
| Port 3000 already in use | Set a different port: create a file named `.env` with `PORT=3001` inside. |
| Extract says a site is blocked | That job board blocks bots — use the direct application (ATS) link, or type it in. |
| Ollama "not running" | Make sure the Ollama app is installed and open, then click **Check again**. |

---

## Backing up / moving your data

Everything is in the **`data/`** folder. Copy `data/applications.json` to back it up,
or use **⚙ Settings → Import / Export → Export** to download a CSV or JSON snapshot.
