import { supplyModel } from '@n8n/ai-node-sdk';
import type {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

type RoutingStrategy = 'balanced' | 'price' | 'latency' | 'uptime';
type ProviderSort = '' | 'price' | 'latency' | 'throughput' | 'uptime';
type ReasoningEffort = '' | 'low' | 'medium' | 'high';

type NodeOptions = {
	allowFallbacks?: boolean;
	anonymize?: boolean;
	fallbackModels?: string;
	frequencyPenalty?: number;
	providerIgnore?: string;
	maxRetries?: number;
	maxTokens?: number;
	providerOnly?: string;
	presencePenalty?: number;
	promptCaching?: boolean;
	providerOrder?: string;
	providerSort?: ProviderSort;
	reasoningEffort?: ReasoningEffort;
	routingStrategy?: RoutingStrategy;
	temperature?: number;
	timeout?: number;
	topP?: number;
};

type ModelsResponse = {
	data?: Array<{ id?: string; display_name?: string; kind?: string }>;
};

const DEFAULT_BASE_URL = 'https://boldrouter.com/v1';

function toList(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export class BoldRouterChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BoldRouter Chat Model',
		name: 'boldRouterChatModel',
		icon: { light: 'file:../../icons/boldrouter.svg', dark: 'file:../../icons/boldrouter.dark.svg' },
		group: ['transform'],
		version: [1],
		description:
			'Use any model on BoldRouter (129+ models, 26+ providers) with automatic routing and failover',
		subtitle: '={{$parameter.model}}',
		defaults: {
			name: 'BoldRouter Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://boldrouter.com/docs',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'boldRouterApi',
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'BoldRouter exposes an OpenAI-compatible API. Model IDs use the form <code>provider/model</code>, e.g. <code>anthropic/claude-sonnet-4.6</code>. Use <code>bold/auto</code>, <code>bold/frontier</code> or <code>bold/fast</code> to let BoldRouter pick the model.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				default: 'bold/auto',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Allow Fallbacks',
						name: 'allowFallbacks',
						type: 'boolean',
						default: true,
						description: 'Whether to fail over to another provider when the preferred one errors',
					},
					{
						displayName: 'Anonymize Prompts',
						name: 'anonymize',
						type: 'boolean',
						default: false,
						description:
							'Whether to redact personal data (PII) from prompts before they reach the model provider. Original values are restored in the response.',
					},
					{
						displayName: 'Fallback Models',
						name: 'fallbackModels',
						type: 'string',
						default: '',
						placeholder: 'e.g. openai/gpt-5.5, google/gemini-2.5-pro',
						description:
							'Comma-separated model IDs to try in order if the primary model fails, even on non-retryable errors',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						type: 'number',
						default: 0,
						typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
						description:
							"Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim",
					},
					{
						displayName: 'Ignore Providers',
						name: 'providerIgnore',
						type: 'string',
						default: '',
						placeholder: 'e.g. deepseek',
						description: 'Comma-separated denylist. These providers will never be used.',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						type: 'number',
						default: 2,
						typeOptions: { minValue: 0, maxValue: 10 },
						description:
							'How many times to retry a failed request. BoldRouter already fails over between providers, so this only covers rate limits and transient network errors.',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						type: 'number',
						default: -1,
						typeOptions: { minValue: -1 },
						description:
							'The maximum number of tokens to generate in the completion. Use -1 for the model default.',
					},
					{
						displayName: 'Only Providers',
						name: 'providerOnly',
						type: 'string',
						default: '',
						placeholder: 'e.g. openai, google',
						description: 'Comma-separated allowlist. Only these providers will be used.',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						type: 'number',
						default: 0,
						typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
						description:
							"Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics",
					},
					{
						displayName: 'Prompt Caching',
						name: 'promptCaching',
						type: 'boolean',
						default: true,
						description:
							'Whether to let BoldRouter cache repeated prompt prefixes to lower cost and latency',
					},
					{
						displayName: 'Provider Order',
						name: 'providerOrder',
						type: 'string',
						default: '',
						placeholder: 'e.g. anthropic, openai',
						description: 'Comma-separated list of providers to try first, in this order',
					},
					{
						displayName: 'Provider Sort',
						name: 'providerSort',
						type: 'options',
						default: '',
						description: 'Override the ordering of candidate providers for this request',
						options: [
							{ name: 'Latency', value: 'latency' },
							{ name: 'Price', value: 'price' },
							{ name: 'Throughput', value: 'throughput' },
							{ name: 'Uptime', value: 'uptime' },
							{ name: 'Use Routing Strategy', value: '' },
						],
					},
					{
						displayName: 'Reasoning Effort',
						name: 'reasoningEffort',
						type: 'options',
						default: '',
						description:
							'Enable thinking mode on models that support it and control how much they reason',
						options: [
							{ name: 'Model Default', value: '' },
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
						],
					},
					{
						displayName: 'Routing Strategy',
						name: 'routingStrategy',
						type: 'options',
						default: 'balanced',
						description:
							'How BoldRouter picks a provider when several can serve the model. Sent as the x-bold-routing header.',
						options: [
							{
								name: 'Balanced',
								value: 'balanced',
								description: 'Blend price, latency, uptime and configured weight (default)',
							},
							{ name: 'Latency', value: 'latency', description: 'Prefer the fastest provider' },
							{ name: 'Price', value: 'price', description: 'Prefer the cheapest provider' },
							{ name: 'Uptime', value: 'uptime', description: 'Prefer the most reliable provider' },
						],
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
					},
					{
						displayName: 'Timeout (Ms)',
						name: 'timeout',
						type: 'number',
						default: 300000,
						typeOptions: { minValue: 1000 },
						description: 'Maximum time to wait for a response, in milliseconds',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
						description:
							'Controls diversity via nucleus sampling: 0.5 means half of all likelihood-weighted options are considered. We generally recommend altering this or temperature but not both.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('boldRouterApi');
				const baseUrl = ((credentials.url as string) || DEFAULT_BASE_URL).replace(/\/+$/, '');

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'boldRouterApi',
					{
						method: 'GET',
						url: `${baseUrl}/models`,
						json: true,
					},
				)) as ModelsResponse;

				// The catalog also serves embedding, audio and translation models. None of
				// them can answer a chat completion, so they must not reach this dropdown.
				const models = (response.data ?? [])
					.filter(
						(model) =>
							typeof model.id === 'string' &&
							model.id.length > 0 &&
							(model.kind ?? 'chat') === 'chat',
					)
					.map((model) => ({
						name: model.id as string,
						value: model.id as string,
						description:
							model.display_name && model.display_name !== model.id
								? model.display_name
								: undefined,
					}));

				// Surface the auto-router IDs first, then everything else alphabetically.
				const isAuto = (id: string) => id.startsWith('bold/');
				return models.sort((a, b) => {
					if (isAuto(a.value) !== isAuto(b.value)) return isAuto(a.value) ? -1 : 1;
					return a.name.localeCompare(b.name);
				});
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('boldRouterApi');
		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as NodeOptions;

		if (!model) {
			throw new NodeOperationError(this.getNode(), 'Please select a model', { itemIndex });
		}

		const baseUrl = ((credentials.url as string) || DEFAULT_BASE_URL).replace(/\/+$/, '');

		// BoldRouter-specific request headers.
		const defaultHeaders: Record<string, string> = {};
		if (options.routingStrategy && options.routingStrategy !== 'balanced') {
			defaultHeaders['x-bold-routing'] = options.routingStrategy;
		}

		// BoldRouter-specific request body extensions (merged into the chat/completions payload).
		const additionalParams: Record<string, unknown> = {};

		const provider: Record<string, unknown> = {};
		const order = toList(options.providerOrder);
		const only = toList(options.providerOnly);
		const ignore = toList(options.providerIgnore);
		if (order.length) provider.order = order;
		if (only.length) provider.only = only;
		if (ignore.length) provider.ignore = ignore;
		if (options.allowFallbacks === false) provider.allow_fallbacks = false;
		if (options.providerSort) provider.sort = options.providerSort;
		if (Object.keys(provider).length) additionalParams.provider = provider;

		const fallbackModels = toList(options.fallbackModels);
		if (fallbackModels.length) additionalParams.models = [model, ...fallbackModels];

		if (options.reasoningEffort) {
			additionalParams.reasoning = { enabled: true, effort: options.reasoningEffort };
		}
		if (options.anonymize) additionalParams.anonymize = true;
		if (options.promptCaching === false) additionalParams.cache = false;

		const maxTokens =
			typeof options.maxTokens === 'number' && options.maxTokens > 0 ? options.maxTokens : undefined;

		return supplyModel(this, {
			type: 'openai',
			baseUrl,
			apiKey: credentials.apiKey as string,
			model,
			defaultHeaders: Object.keys(defaultHeaders).length ? defaultHeaders : undefined,
			additionalParams: Object.keys(additionalParams).length ? additionalParams : undefined,
			temperature: options.temperature,
			topP: options.topP,
			maxTokens,
			frequencyPenalty: options.frequencyPenalty,
			presencePenalty: options.presencePenalty,
			timeout: options.timeout,
			maxRetries: options.maxRetries,
			streaming: true,
			streamUsage: true,
		});
	}
}
