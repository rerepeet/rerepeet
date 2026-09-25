# Provider setup guide

## Gemini

Create a key in Google AI Studio, select **Google Gemini**, and paste the key into Rerepeet. The default model is `gemini-3.5-flash-lite`. Gemini supports microphone capture in Rerepeet.

## Groq

Create a Groq API key, select **Groq**, and paste it into Rerepeet. The default chat model is `openai/gpt-oss-20b`. Rerepeet sends consented audio to Groq transcription first and then sends the resulting text to chat.

## OpenRouter Free

Create an OpenRouter key, select **OpenRouter Free**, and keep the default `openrouter/free` model route. The route chooses from the free models OpenRouter has available at that time. It is a typed-prompt connection in Rerepeet.

## Ollama

Install Ollama and download a model, for example:

```bash
ollama pull qwen3:8b
```

Leave Ollama running, choose **Ollama (local)**, and retain the default endpoint `http://127.0.0.1:11434/v1`. No key is needed.

## LM Studio

Load a local model in LM Studio and start its local server. Choose **LM Studio (local)** in Rerepeet and use the default endpoint `http://127.0.0.1:1234/v1`. No key is needed.

## OpenCode

Install OpenCode and run:

```bash
opencode serve
```

Choose **OpenCode (local)** in Rerepeet. Its default local server is `http://127.0.0.1:4096`. OpenCode chooses and manages its own provider connections; Rerepeet only sends the permitted text request to that local server.

## Custom compatible endpoint

Choose **Custom OpenAI-compatible**, enter the provider’s chat-completions base URL, model identifier, and your own API key. Rerepeet appends `/chat/completions` when requesting a response.

## Audio setup

Use **Test microphone** in Setup to trigger your operating system’s microphone permission and display a level meter. Gemini and Groq support consented microphone capture in the app; the other current connectors are text-only.
