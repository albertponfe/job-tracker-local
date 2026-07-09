# 📋 Job Tracker (local)

A simple, private job-application tracker that runs **entirely on your own computer**.
No account, no subscription, no data sent to anyone. Your applications live in a plain
file on your machine (`data/applications.json`).

![It's a table of your job applications with stats, filtering, editing, and archiving.](https://via.placeholder.com/1/000/000)

## What it does

- **Track applications** through stages (Applied → Interview → Offer → …) with click-to-change status.
- **Filter** by status with clickable stat cards.
- **Edit, archive, and delete** any entry.
- **Choose your own fields** — track only what you care about; add custom fields; nothing is forced.
- **(Optional) AI auto-fill** — paste a job link and let a model fill in the details. Use a
  **free local model** (Ollama) or **your own** OpenAI / OpenRouter / Anthropic key. Or skip AI entirely.
- **(Optional) Import a Google Sheet** you already have — once — into your local copy.

## Quick start (one double-click)

- **Windows:** double-click **`start.bat`** — it will even install Node.js for you if it's missing.
- **Mac:** double-click **`start-mac.command`** (first time: right-click → Open to clear the security prompt).
- **Linux:** run **`./start.sh`**.

The first run installs everything, then opens the app at **http://localhost:3000**.
Close the window to stop; double-click again to reopen.

**Developers**, in a terminal instead:
Mac Users:
```bash
cd Downloads/job-tracker-local-main #Change it accordingly for the location of the file (ex: Desktop/...)
npm install     # first time only
npm start       # builds and runs — opens http://localhost:3000
# npm run dev   # hot-reload dev server on :5173 (proxies API to :3000)
```

👉 New to this? See **[SETUP.md](SETUP.md)** for a step-by-step, plain-English guide.

⚠️ Came across an error? See **[Troubleshooting](#Troubleshooting)**.

## Your data & privacy

- Everything is stored locally in the **`data/`** folder (git-ignored — it never gets uploaded).
- The app only talks to the internet if **you** turn on a cloud AI provider or import a Google Sheet.
- To back up or move your data, just copy `data/applications.json`. You can also **Export** to CSV/JSON from Settings.

## Optional: free AI extraction with Ollama (no terminal)

1. Install [Ollama](https://ollama.com) (free, open-source) — just run the installer.
2. In the app: **⚙ Settings → AI Extraction → Ollama**. The app detects Ollama, and a
   **⬇ Download model** button fetches the model for you. When it says "Ready," click **Save**.

Now the **Extract** button auto-fills a job's details from its link — with nothing leaving your computer.
(You can also plug in your own OpenAI / OpenRouter / Anthropic key instead.)

> Note: big job boards (LinkedIn, Indeed, Glassdoor) block automated reading, so Extract won't
> work on them. Direct company/ATS links (Greenhouse, Lever, Ashby, Workday, etc.) usually work fine.

## Importing a Google Sheet

**⚙ Settings → Import / Export** takes a view-shared sheet link and shows a **column-mapping**
step: your headers don't need to match — map each column to a field, create a new one, or ignore it.
Nothing is imported until you confirm, so nothing is lost or misplaced.


## Troubleshooting

| Problem | Fix |
|---|---|
| Browser didn't open | Go to **http://localhost:3000** manually. |
| "Node.js is needed" keeps showing | After installing Node, fully close the window and start again (it needs a fresh window to see Node). |
| Port 3000 already in use | Set a different port: create a file named `.env` with `PORT=3001` inside. |
| Extract says a site is blocked | That job board blocks bots — use the direct application (ATS) link, or type it in. |
| Ollama "not running" | Make sure the Ollama app is installed and open, then click **Check again**. |
| Something else!| Contact me at **albertponferrada@berkeley.edu**. |

---

## License

Do whatever you like with it. Provided as-is, with no warranty.
