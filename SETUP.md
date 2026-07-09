# Setup Guide

This is the friendly, no-experience-needed version. It takes about 5 minutes.

---

## Step 1 — Install Node.js (one time)

The app needs a free tool called **Node.js** to run.

1. Go to **https://nodejs.org**
2. Download the button that says **"LTS"** (Long-Term Support).
3. Open the installer and click Next → Next → Install. Defaults are fine.

You only ever do this once. (To check it worked, you can open a terminal and type
`node --version` — you should see a number like `v20.x.x`.)

---

## Step 2 — Get the app files

Download this project (on GitHub: the green **Code → Download ZIP** button), then
**unzip it** somewhere you'll remember, like your Desktop or Documents folder.

---

## Step 3 — Start it

**Windows:** open the folder and **double-click `start.bat`**.
**Mac / Linux:** open a Terminal in the folder and run:

```bash
chmod +x start.sh   # first time only, makes it runnable
./start.sh
```

The first launch installs a few things (takes a minute) and then your browser opens
automatically at **http://localhost:3000**. That's the app!

> If the browser doesn't open on its own, just visit **http://localhost:3000** yourself.

To stop the app, close the black terminal window (or press `Ctrl+C` in it).
To use it again later, just start it the same way.

---

## Step 4 — Use it

- Click **+ Add Application** to add a job. Fill in as much or as little as you want —
  only **Company** is required.
- Click a job's **status pill** to move it between stages (Applied, Interview, …).
- Click the stat cards up top to **filter** by stage.
- Use the row buttons to **edit ( ✎ )**, **archive ( ⊙ )**, or **delete ( 🗑 )**.
- Archived jobs hide away behind the **📦 Archived** button and don't clutter your list.

Your data saves automatically to `data/applications.json` inside the app folder.

---

## Step 5 (optional) — Turn on AI auto-fill

This lets you paste a job link and have the details filled in for you. Pick **one** option.

### Option A — Free, private, on your computer (Ollama) — recommended
1. Install **Ollama** from **https://ollama.com** (free, open-source, trusted).
2. Open a terminal and run: `ollama pull llama3.2`
3. In the app: **⚙ Settings → AI Extraction**, choose **Ollama**, click **Save settings**.

Nothing you paste ever leaves your machine.

### Option B — Your own cloud key
If you already have an API key from **OpenAI**, **OpenRouter**, or **Anthropic**:
1. **⚙ Settings → AI Extraction**, choose your provider.
2. Paste your key (and model). Click **Save settings**.

> 💡 **OpenRouter** has some genuinely free models. Choose the "OpenAI / OpenRouter…" option,
> set the Base URL to `https://openrouter.ai/api/v1`, and use a model whose name ends in `:free`.

### No AI at all
Totally fine — just leave the provider as **None** and type job details in yourself.

> ⚠️ Extraction can't read LinkedIn / Indeed / Glassdoor (they block bots). Use the direct
> company application link (Greenhouse, Lever, Ashby, Workday…) and it usually works.

---

## Step 6 (optional) — Import an existing Google Sheet

Already tracking jobs in a Google Sheet? Bring it in once:

1. In **Google Sheets**: click **Share** → under *General access* pick **"Anyone with the link"** → role **Viewer**.
2. Make sure your first row has clear column headers: e.g. `Company`, `Position`, `Status`, `Salary`, `Location`, `Job Link`.
3. Copy the sheet's URL from your browser.
4. In the app: **⚙ Settings → Import / Export**, paste the link, click **Import from Google Sheet**.

The rows are copied into your local app. After that, your Google Sheet and the app are
independent — edits here don't touch your sheet, and vice-versa.

---

## Choosing your own fields

Open **⚙ Settings → Fields** to:
- **Track** — turn a field on/off (e.g. hide Salary if you don't want it).
- **In table** — show/hide a field as a column in the main list.
- **Add a custom field** — type a name (like "Referral" or "Deadline") and click **+ Add field**.

Only **Company** is required; everything else is yours to shape.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Node.js is not installed" | Do Step 1, then start again. |
| Browser didn't open | Go to **http://localhost:3000** manually. |
| Port 3000 already in use | Start with a different port: `PORT=3001 npm start` (Mac/Linux) or set `PORT` in a `.env` file. |
| Extract says a site is blocked | That job board blocks bots — use the direct application (ATS) link, or fill in manually. |
| Ollama errors | Make sure Ollama is installed and running, and that you ran `ollama pull llama3.2`. |

---

## Backing up / moving your data

Everything you enter is in the **`data/`** folder. Copy `data/applications.json` to back it up,
or use **⚙ Settings → Import / Export → Export** to download a CSV or JSON snapshot anytime.
