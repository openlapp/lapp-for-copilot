# Add a provider and model

1. Create a provider with a base URL, protocol, and auth method.
2. Store credentials in the system Vault. The Manager never redisplays secrets.
3. Add a model only after its protocol is one of `openai-chat-completions`, `openai-responses`, or `anthropic-messages`.
4. Mark `tool-call`, `stream`, and image input explicitly. Copilot will not infer them from a name.
