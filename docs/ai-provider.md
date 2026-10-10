# AI provider (bring your own)

Luora does not host an AI. The **Ask** panel in the atlas (Explain / What could go wrong? / Write
invariant test) answers from built-in text by default. If you want a model's answer instead, connect
your own: your own Claude (Claude Code with your Claude plan), a model running on your machine, or your own API key.

Open it from the app header: **AI · None** → *AI provider*.

| Option | What answers | What leaves your machine |
|---|---|---|
| **None** (default) | Luora's built-in text | Nothing. No network call is made. |
| **Your Claude** | Your own Claude Code, signed in with your own Claude plan (Pro / Max) | The prompt goes from the page to this app's local route, which hands it to the `claude` program on your laptop; Claude Code sends it to Anthropic under your own login. |
| **Local model** | Ollama / LM Studio / any OpenAI-compatible server you run | The prompt goes from your browser to the endpoint you typed (normally `localhost`, so it stays on your machine). |
| **Own API key** | Anthropic, OpenAI or OpenRouter | The prompt and your key go from your browser straight to that provider's API. |

For Local model and Own API key, calls go **directly from your browser** to the provider: there is no
Luora server route in between, and Luora never sees your prompt, the answer or your key. **Your Claude**
is the one exception: it needs a program on your laptop, so the prompt passes through this app's own
local route (`/api/claude`) on its way to your Claude Code. Your Claude login never touches Luora.

## What is sent

Only when you click an Ask button, and only for the selected piece:

- the contract name and file name,
- the piece (name, system, description, who may call it),
- its own source lines (at most 120),
- the names of the pieces connected to it,
- open findings on it (name, severity, description),
- the built-in checklist for that kind of piece,
- the question you clicked.

Plus a fixed system prompt that keeps the model defensive: explain behaviour, list what an auditor
should check, write a Foundry test that pins the **intended** behaviour, and refuse to write exploits
or attack steps. The rest of your project (other files, traces, coverage, triage notes) is not sent.

If the call fails (server down, bad key, unknown model, CORS), the panel shows the error and falls
back to the built-in answer.

## Your key

- Stored only in this browser's `localStorage` (key `luora.ai`), in plain text, like any browser
  setting. Anyone with access to this browser profile can read it; use a key you can revoke, and
  set a spend limit on it at the provider.
- Sent only to the provider you picked (Anthropic: `api.anthropic.com`, OpenAI: `api.openai.com`,
  OpenRouter: `openrouter.ai`). Switching provider clears the key field, so a key never follows you
  to another provider.
- Never logged and never sent to a Luora server.
- **Forget key** in the dialog deletes it from `localStorage` right away.

## Your Claude (your Claude plan, like Orca)

Ask answered by **your own Claude Code** on your laptop, with the Claude plan you already pay for,
the way [Orca](https://www.onorca.dev) runs the agents you are already subscribed to. Luora never asks
for, reads or stores your Claude login: it runs the unmodified `claude` program, which uses its own.

1. Install Claude Code and run `claude` once in a terminal to sign in with your Claude account.
2. Run Luora locally (`pnpm dev`) and open it at `localhost`.
3. **Connect AI → Your Claude.** The dialog shows whether Claude Code was found and how it is signed
   in (e.g. *signed in with your Claude max plan*). Pick a model (Default, Fable 5.1, Opus 5.5,
   Sonnet 5, Haiku 4.5; also from the chip under the Ask box) and **Test connection**.

**Disconnect** (bottom left of the dialog) only stops Luora using your Claude; Claude Code stays
signed in. **Sign out of Claude** (in the Your Claude panel, after a confirm) runs Claude Code's own
`claude auth logout`: that signs Claude Code out on the whole laptop, terminals and Orca included.
**Sign in with Claude** runs `claude auth login --claudeai`, which opens claude.ai's sign-in page in
your browser; the dialog updates by itself when you finish there (`app/api/claude/auth`, same local
guard as the bridge).

**Only on your laptop.** A hosted Luora (e.g. on Vercel) cannot use your Claude: the `claude` program
and its login live on your machine, and the route is switched off there. Use Own API key on a hosted
Luora, or run Luora locally.

How it works: the page posts the question with its context to `app/api/claude`, which runs

```sh
claude -p --output-format stream-json --verbose --include-partial-messages \
  --tools "" --strict-mcp-config --setting-sources "" --disable-slash-commands \
  --no-session-persistence --permission-mode dontAsk --system-prompt "<Luora's defensive prompt>"
```

in a fresh empty temporary folder (deleted afterwards), with the prompt on stdin, and streams the
text back. So:

- **No tools, no files, no MCP servers, no hooks:** Claude only answers. Your user and project
  settings (and their hooks) are not loaded, and nothing of your project folder is visible to it.
- **Same defensive system prompt** as the other providers, fixed on the server.
- **Your plan's limits:** each Ask uses your Claude usage like any Claude Code prompt. Two answers
  can run at once; each stops after three minutes or when you press Stop.
- **Local only:** the route answers only requests from this app's own page at `localhost` /
  `127.0.0.1` (checked from the Host, Origin and Sec-Fetch-Site headers, which stops other websites
  and DNS rebinding) and is disabled on a hosted deployment (`VERCEL` or `LUORA_HOSTED` set).
  `next dev` listens on your network too; on a shared network, start it with `pnpm dev -H 127.0.0.1`.
- **Not for resale:** Anthropic allows you to use your own subscription in the unmodified Claude Code
  on your machine; it does not allow apps to offer Claude.ai login or route other people's requests
  through Pro / Max plans. Each auditor connects their own Claude on their own laptop.

## Local model: Ollama

1. Install Ollama and pull a model, e.g. `ollama pull llama3.1` (a coder model such as
   `qwen2.5-coder` writes better Foundry tests).
2. Ollama serves an OpenAI-compatible API at `http://localhost:11434/v1`, which is the default
   endpoint in the dialog. Set **Model** to the name you pulled.
3. Click **Test connection**.

**CORS / origin.** Your browser calls Ollama from Luora's page, so Ollama must allow that page's
origin. By default Ollama allows `http://localhost:*` and `http://127.0.0.1:*`, so a Luora app running
on localhost works without changes. If you open Luora from any other origin, allow it:

```sh
# macOS app
launchctl setenv OLLAMA_ORIGINS "https://your-luora-host"
# then restart Ollama.  CLI / Linux:
OLLAMA_ORIGINS="https://your-luora-host" ollama serve
```

Avoid `OLLAMA_ORIGINS="*"`: it lets every website you visit talk to your local model.

Chrome may also ask once for permission for a page to reach your local network (Local Network
Access); allow it for Luora. Safari blocks `http://localhost` calls from an `https://` page; use Chrome
or Firefox, or run Luora locally.

## Local model: LM Studio

Start the server (Developer tab → *Start server*), turn on **Enable CORS** in its server settings,
and set the endpoint to `http://localhost:1234/v1`. Use the model identifier LM Studio shows.

Any other OpenAI-compatible server (llama.cpp `llama-server`, vLLM, …) works the same way: endpoint
ending in `/v1`, CORS allowed for Luora's origin. An optional key is sent as `Authorization: Bearer`.

## Own API key

Pick the provider, paste your key, check the model (prefilled with a current default: Anthropic
`claude-sonnet-5`, OpenAI `gpt-5`, OpenRouter `anthropic/claude-sonnet-5`) and click **Test connection**.
It sends one tiny request ("reply with ok") and shows the reply or the provider's error.

- **Anthropic**: the browser call carries `anthropic-dangerous-direct-browser-access: true`, which is
  what Anthropic requires for direct browser access. That is fine here because the key is yours and
  stays in your browser.
- **OpenAI / OpenRouter**: standard `Authorization: Bearer` key on `/chat/completions`.

Answers stream into the Ask panel as they arrive. Each Ask click is one request, billed to your key.
