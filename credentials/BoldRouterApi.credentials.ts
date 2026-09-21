import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class BoldRouterApi implements ICredentialType {
	name = 'boldRouterApi';

	displayName = 'BoldRouter API';

	documentationUrl = 'https://boldrouter.com/docs/authentication';

	icon: Icon = { light: 'file:../icons/boldrouter.svg', dark: 'file:../icons/boldrouter.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'sk-bold-...',
			description:
				'Create and manage keys at <a href="https://boldrouter.com/dashboard/keys" target="_blank">boldrouter.com/dashboard/keys</a>',
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'hidden',
			default: 'https://boldrouter.com/v1',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/models',
			method: 'GET',
		},
	};
}
