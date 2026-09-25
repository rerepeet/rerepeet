# Rerepeet

![Rerepeet launch banner](assets/brand/rerepeet-banner.png)

> A consent-first, desktop AI workspace with **Byte**, a small computer companion.

[![Build desktop downloads](https://github.com/rerepeet/rerepeet/actions/workflows/release.yml/badge.svg)](https://github.com/rerepeet/rerepeet/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/rerepeet/rerepeet?display_name=tag&color=71ad4e)](https://github.com/rerepeet/rerepeet/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-273b2a)](LICENSE)

Rerepeet is a real Electron desktop application, not a hosted web page. Choose the model provider that fits your setup, make consent visible before any microphone capture, and keep session history on your device.

## Download Rerepeet

| Platform | Direct download | CPU |
| --- | --- | --- |
| macOS Apple Silicon | [Download DMG](https://github.com/rerepeet/rerepeet/releases/latest/download/Rerepeet-mac-arm64.dmg) | M1, M2, M3, M4 and later |
| macOS Intel | [Download DMG](https://github.com/rerepeet/rerepeet/releases/latest/download/Rerepeet-mac-x64.dmg) | Intel Macs |
| Windows | [Download installer](https://github.com/rerepeet/rerepeet/releases/latest/download/Rerepeet-win-x64.exe) | 64-bit Windows |
| Linux | [Download AppImage](https://github.com/rerepeet/rerepeet/releases/latest/download/Rerepeet-linux-x86_64.AppImage) | 64-bit Linux |

Every tagged release publishes a checksum file and separate Apple Silicon and Intel macOS packages. Current and previous packages are on the [Releases page](https://github.com/rerepeet/rerepeet/releases).

## What it does

- Full desktop setup screen for provider, model, endpoint, key storage, microphone permission, and a live input test.
- Provider switcher for Gemini, Groq, OpenRouter Free, Ollama, LM Studio, OpenCode, and a custom OpenAI-compatible endpoint.
- Typed prompts for all providers; consent-gated microphone capture for Gemini and Groq.
- A guided Session Studio for regular conversations, mock practice, or study: context, language, local-history and note-format preferences, then an explicit participant-consent confirmation.
- Local session history, clear-session controls, and OS-backed encrypted key storage when “remember key” is enabled.
- A manually opened, clearly visible companion panel for quick workspace controls; it has no hidden mode and never answers on a user’s behalf.
- A clear recording indicator and a product boundary against hidden recording, evasion, and deceptive use.

## Choose your provider

| Connection | Key needed | Audio in Rerepeet | Notes |
| --- | --- | --- | --- |
| Google Gemini | Your key | Native audio | Free tier may be available, but quotas apply. |
| Groq | Your key | Whisper transcription then chat | Fast cloud inference; plan limits apply. |
| OpenRouter Free | Your key | Typed prompts | Uses `openrouter/free`; available free models can change. |
| Ollama | No | Typed prompts | Local model and local server on your computer. |
| LM Studio | No | Typed prompts | Local model and local server on your computer. |
| OpenCode | Optional local server auth | Typed prompts | Connects to `opencode serve` on your computer. |
| Custom compatible API | Usually | Typed prompts | Any endpoint that implements OpenAI chat completions. |

“Free” never means unlimited. Rerepeet does not create accounts, mint keys, bypass provider quotas, or send your key through a Rerepeet server. See [Provider setup](FEATURE_GUIDE.md) for exact setup details and links.

## First run

1. Install the package for your platform above and open **Rerepeet**.
2. Pick a provider in **Setup**.
3. Add your own key, or point Rerepeet at Ollama, LM Studio, or OpenCode running locally.
4. Use **Test microphone** to grant and check audio access.
5. Create a session in Session Studio, choose preferences, then confirm that everyone involved agreed before recording.

## Privacy and consent

- The app talks directly to the provider or local endpoint you select.
- Rerepeet never uploads session history to a Rerepeet service.
- Keys stay in memory unless you opt into secure OS key storage.
- Microphone capture cannot begin until the consent checkbox is confirmed.

Read [Features](FEATURES.md), the step-by-step [Provider guide](FEATURE_GUIDE.md), [Security](SECURITY.md), and the [changelog](CHANGELOG.md).

## Build from source

```bash
npm ci
npm run dev
```

Package a platform download with one of:

```bash
npm run package:mac:arm64
npm run package:mac:x64
npm run package:windows
npm run package:linux
```

The release workflow creates all four packages from version tags and makes them available through the stable direct-download URLs above.

## License

MIT. See [LICENSE](LICENSE).
