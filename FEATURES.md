# Rerepeet features

## A full desktop tool

Rerepeet ships as a native Electron desktop app for macOS Apple Silicon, macOS Intel, Windows, and Linux. It includes a provider setup flow, microphone permission test, Session Studio, visible companion panel, local session history, and a release workflow that publishes direct-download packages.

Session Studio supports regular, mock-practice, and study modes. It collects context, language, note-format, and local-history preferences before the user explicitly confirms that participants agreed to any recording. The companion panel is manually opened, always visible, and contains only manual workspace controls; it has no hidden mode or automatic answering.

## Provider connections

Rerepeet deliberately separates a model provider from the product interface:

- **Gemini** uses Google’s native generate-content API and can send consented audio directly.
- **Groq** uses its compatible chat API. For audio, Rerepeet asks Groq’s transcription endpoint first, then sends the transcript to chat.
- **OpenRouter** uses the `openrouter/free` route for typed prompts.
- **Ollama** and **LM Studio** use their local OpenAI-compatible server interfaces. They need no cloud key.
- **OpenCode** uses the local server started with `opencode serve`, keeping its provider configuration outside Rerepeet.
- **Custom** supports a user-supplied compatible chat-completions endpoint.

The provider surface is intentionally honest: free tiers and locally installed models can be useful, but no cloud provider is represented as unlimited or guaranteed free.

## Audio, privacy, and safe use

The microphone is never opened simply by entering a session. A person must actively tick the consent control before a recording can start. A visible recording state remains on screen. Audio is sent only to the chosen provider for a requested response, and local session history is maintained by the desktop app.

Rerepeet is built for explicitly permitted notes, study, mock practice, and meetings. It rejects hidden recording, evading detection, deception, and unauthorized assistance.

## Local history and keys

Session history is stored in the app’s local browser data. It can be cleared from the session list. API keys are only retained in the current app memory unless the user chooses “remember key”; then Electron’s operating-system secure storage is used when available.
