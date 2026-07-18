# 📋 Job Tracker (local)

A simple, private job-application tracker that runs **entirely on your own computer**.
No account or subscription. Your applications live in a plain
file on your machine (`data/applications.json`).

## What it does

- **Track applications** through stages (Applied → Interview → Offer → …) with click-to-change status.
- **Filter** by status with clickable stat cards.
- **Edit, archive, and delete** any entry.
- **Choose your own fields** — track only what you care about; add custom fields; nothing is forced.
- **Auto-fill from a link — no AI needed for many sites.** Paste a job link and hit **Extract**.
  Links from **Greenhouse, Lever, Ashby, SmartRecruiters, Workable, and Workday** fill in automatically
  by reading each site's own public data — no API key, no setup, nothing sent to any AI.
- **(Optional) AI auto-fill for everything else** — for other sites, let a model fill in the details. Use a
  **free local model** (Ollama) or **your own** OpenAI or Anthropic key. Or skip AI entirely.
- **(Optional) Import a Google Sheet** you already have — once — into your local copy.

## Quick start (one double-click)

- **Windows:** double-click **`start.bat`** — it will even install Node.js for you if it's missing.
- **Mac:** double-click **`start-mac.command`** (If a warning appears check **[Troubleshooting](#Troubleshooting)**).
- **Linux:** run **`./start.sh`**.

The first run installs everything, then opens the app at **http://localhost:3000**.
Close the window to stop; double-click again to reopen.

**Developers**, in a terminal go inside the downloaded folder and run:

```bash
cd Downloads/job-tracker-local-main #Change it accordingly for the location of the file (ex: Desktop/...)
npm install     # first time only
npm start       # builds and runs — opens http://localhost:3000
# npm run dev   # hot-reload dev server on :5173 (proxies API to :3000)
```
Opens the app at **http://localhost:3000**.

👉 New to this? See **[SETUP.md](SETUP.md)** for a step-by-step, plain-English guide.

⚠️ Came across an error? See **[Troubleshooting](#Troubleshooting)**.

## Your data & privacy

- Everything is stored locally in the **`data/`** folder (git-ignored — it never gets uploaded).
- Queue contacts a job site when you extract a link or load its favicon in the table, Google only when you import a Sheet, and an AI provider only when you configure one.
- To back up or move everything, copy the entire **`data/`** folder. The **Import** screen can also export application rows to CSV/JSON.

## Extracting job details from a link

Hit **Extract** after pasting a job URL and the app fills in company, position, location, salary,
and employment type for you.

- **No AI required** for **Greenhouse, Lever, Ashby, SmartRecruiters, Workable, and Workday** links —
  the app reads each site's own public data directly. This works out of the box with no keys or setup.
- **Everything else** (a company's own careers page, smaller boards, etc.) falls back to AI extraction,
  which you enable below. Turn it on once and Extract works on those pages too.

## Optional: free AI extraction with Ollama (no terminal)

1. Install [Ollama](https://ollama.com) (free, open-source) — just run the installer.
2. Click **AI**, then choose **Ollama**. The app detects Ollama, and a
   **⬇ Download model** button fetches the model for you. When it says "Ready," click **Save**.

Now the **Extract** button auto-fills a job's details from its link — with nothing leaving your computer.
(You can also plug in your own OpenAI or Anthropic key instead.)

> Note: big job boards (LinkedIn, Indeed, Glassdoor) block automated reading, so Extract won't
> work on them. Direct company/ATS links (Greenhouse, Lever, Ashby, SmartRecruiters, Workable,
> Workday, etc.) work best — and the first six of those need no AI at all.

## Importing a Google Sheet

Click **Import** to paste a view-shared sheet link and see a **column-mapping**
step: your headers don't need to match — map each column to a field, create a new one, or ignore it.
Nothing is imported until you confirm, so nothing is lost or misplaced.


## Troubleshooting

| Problem | Fix |
|---|---|
| Browser didn't open | Go to **http://localhost:3000** manually. |
| "Node.js is needed" keeps showing | After installing Node, fully close the window and start again (it needs a fresh window to see Node). |
| Port 3000 already in use | Stop the other Queue window first. To use another port, run `PORT=3001 npm start` on macOS/Linux or `set "PORT=3001" && npm start` in Windows Command Prompt. |
| Extract says a site is blocked | That job board blocks bots — use the direct application (ATS) link, or type it in. |
| Ollama "not running" | Make sure the Ollama app is installed and open, then click **Check again**. |
| Something else!| Contact me at **albertponferrada@berkeley.edu**. |

---

## License

Do whatever you like with it. Provided as-is, with no warranty.
