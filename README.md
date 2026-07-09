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

## Quick start

You need [**Node.js**](https://nodejs.org) (the "LTS" version) installed. Then:

**Easiest:** double-click **`start.bat`** (Windows) or run **`./start.sh`** (macOS/Linux).
It installs everything the first time, builds the app, and opens it in your browser.

**Or, in a terminal** inside this folder:

```bash
npm install     # first time only
npm start       # builds and runs — opens http://localhost:3000
```

To stop it, press `Ctrl+C` in the terminal.

👉 New to this? See **[SETUP.md](SETUP.md)** for a step-by-step, screenshots-in-words guide.

## Your data & privacy

- Everything is stored locally in the **`data/`** folder (git-ignored — it never gets uploaded).
- The app only talks to the internet if **you** turn on a cloud AI provider or import a Google Sheet.
- To back up or move your data, just copy `data/applications.json`. You can also **Export** to CSV/JSON from Settings.

## Optional: free AI extraction with Ollama

1. Install [Ollama](https://ollama.com) (free, open-source).
2. In a terminal: `ollama pull llama3.2`
3. In the app: **Settings → AI Extraction → Ollama**, then Save.

Now the **Extract** button auto-fills a job's details from its link — with nothing leaving your computer.

> Note: big job boards (LinkedIn, Indeed, Glassdoor) block automated reading, so Extract won't
> work on them. Direct company/ATS links (Greenhouse, Lever, Ashby, Workday, etc.) usually work fine.

## License

Do whatever you like with it. Provided as-is, with no warranty.
