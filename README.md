# Signal Room

Signal Room is a launch-ready Electron desktop app for consented meetings, self-study, and mock practice. It records short microphone chunks, sends them directly from the local desktop app to Gemini with the API key supplied for the active session, and returns a rolling transcript plus concise suggestions.

It deliberately does **not** include stealth, screen-share evasion, background surveillance, exam assistance, or deceptive interview features.

## What is included

- Native desktop launch for macOS, Windows, and Linux via Electron Builder
- Bring-your-own Gemini API key, held only in the app’s memory
- Microphone capture in short rolling chunks
- Gemini audio understanding, transcript capture, and context-aware suggestions
- Manual text/excerpt workflow when audio is not appropriate
- Local session history stored in the app browser profile, never including API keys
- Consent gate before microphone or Gemini use
- Packaged build, test, and release scripts

## Develop

```bash
npm install
npm run dev
```

This launches a Vite development server and the Electron app. Allow microphone access only for a conversation where every participant has agreed to recording and AI assistance.

## Desktop downloads

Every version tag, such as `v0.1.0`, starts the GitHub Actions release workflow. It publishes these downloads to the GitHub Release page:

- macOS Apple Silicon `.dmg`
- macOS Intel `.dmg`
- Windows x64 `.exe`
- Linux x64 `.AppImage`

The packaged desktop app is unsigned until macOS code-signing/notarization and Windows code-signing credentials are configured in the repository secrets. The downloads still run locally, but operating systems may show a trust warning until they are signed.

## Package a release locally

```bash
npm run build
npm run dist
```

Platform-specific local builds are `npm run package:mac:arm64`, `npm run package:mac:x64`, `npm run package:windows`, and `npm run package:linux`. Installers are written to `release/` by Electron Builder.

## Gemini setup

Create a restricted Gemini key in Google AI Studio, then paste it into **Session context** in Signal Room. The app calls `models/{model}:generateContent` using the `x-goog-api-key` header. Gemini’s available models, quotas, usage limits, and any charges remain governed by the Google project behind your key; this repository does not create unlimited or free Gemini usage.

## GitHub launch checklist

1. Create a new private or public GitHub repository and push this directory.
2. Add a repository description, screenshots, and an open-source license appropriate to your launch.
3. Push a `v*` version tag; GitHub Actions builds all four desktop downloads and attaches them to a GitHub Release.
4. Keep Gemini keys out of the repository and use application-restricted keys when possible.

## Important implementation note

Audio is sent as browser-recorded WebM/Opus chunks to the Gemini `generateContent` endpoint. If your selected model or key does not accept that media type, use the text mode while configuring a production transcription provider or switch the capture format/model based on the Gemini capabilities for your account.
