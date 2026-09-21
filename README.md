# n8n-nodes-boldrouter

This is an n8n community node. It lets you use [BoldRouter](https://boldrouter.com) as the language model behind AI Agents, LLM Chains and every other n8n AI node.

BoldRouter is an OpenAI-compatible LLM gateway. One API key gives you 129+ models across 26+ providers, with automatic provider routing, failover, prompt caching and PII anonymization.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

Once the node is verified you can install it straight from the nodes panel: search for **BoldRouter** and click **Install**. On self-hosted instances you can also go to **Settings → Community Nodes → Install** and enter `n8n-nodes-boldrouter`.

## Operations

This package provides one sub-node:

- **BoldRouter Chat Model**: a language model sub-node. Connect it to the *Model* input of an AI Agent, Basic LLM Chain, Question and Answer Chain, Summarization Chain or any other node that accepts a chat model.

Supported features:

- Live model list loaded from your BoldRouter account (`GET /v1/models`)
- Auto-router models `bold/auto`, `bold/frontier` and `bold/fast`
- Streaming, tool calling and multimodal pass-through
- Routing strategy (balanced, price, latency, uptime)
- Provider preferences: order, allowlist, denylist, fallbacks, sort
- Cross-model fallback chains
- Reasoning effort (thinking mode)
- Prompt anonymization (PII redaction)
- Prompt caching on/off
- Temperature, top P, max tokens, frequency and presence penalty, timeout, retries

## Credentials

1. Sign up at [boldrouter.com](https://boldrouter.com) and open the [API keys page](https://boldrouter.com/dashboard/keys).
2. Create a key. Keys start with `sk-bold-`.
3. In n8n, add a **BoldRouter API** credential and paste the key. The credential test calls `GET /v1/models` to confirm the key is valid.

See the [authentication docs](https://boldrouter.com/docs/authentication) for details.

## Compatibility

Requires an n8n version that ships `@n8n/ai-node-sdk` (n8n 2.x, 2026 releases). Tested against n8n 2.39.

## Usage

1. Add an **AI Agent** (or any chain node) to your workflow.
2. Click the **Model** connector and choose **BoldRouter Chat Model**.
3. Select your BoldRouter credential and pick a model. `bold/auto` lets BoldRouter choose the best model for each request.
4. Open **Options** to tune routing. For example, set *Provider Order* to `anthropic, openai` and *Fallback Models* to `openai/gpt-5.5` to prefer Anthropic but survive an outage.

Model IDs use the form `provider/model`, for example `anthropic/claude-sonnet-4.6` or `google/gemini-2.5-pro`. You can also supply the model ID with an expression.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [BoldRouter documentation](https://boldrouter.com/docs)
- [BoldRouter chat completions reference](https://boldrouter.com/docs/chat-completions)
- [BoldRouter routing reference](https://boldrouter.com/docs/routing)

## Version history

- **0.1.0**: Initial release with the BoldRouter Chat Model sub-node.

## Credits

- Project: [BoldRouter](https://boldrouter.com)
- Author: GentleBulldozer ([GentleDozer on X](https://x.com/GentleDozer))
- Owner: Cybrient Technologies SA

## License

[MIT](LICENSE.md)
