# AI provider (bring your own)

Luora does not host an AI. The **Ask** panel in the atlas (Explain / What could go wrong? / Write
invariant test) answers from built-in text by default. If you want a model's answer instead, connect
your own: a model running on your machine, or your own API key.

Open it from the app header: **AI · None** → *AI provider*.

| Option | What answers | What leaves your machine |
|---|---|---|
| **None** (default) | Luora's built-in text | Nothing. No network call is made. |
| **Local model** | Ollama / LM Studio / any OpenAI-compatible server you run | The prompt goes from your browser to the endpoint you typed (normally `localhost`, so it stays on your machine). |
| **Own API key** | Anthropic, OpenAI or OpenRouter | The prompt and your key go from your browser straight to that provider's API. |

In every case calls go **directly from your browser** to the provider. There is no Luora server route
in between, and Luora never sees your prompt, the answer or your key.

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
