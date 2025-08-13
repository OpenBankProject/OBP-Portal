import { createLogger } from '$lib/utils/logger';
const logger = createLogger('OBPRequests');
import { env } from '$env/dynamic/public';
import { OBPErrorBase, OBPRequestError } from '$lib/obp/errors';

class OBPRequests {
	base_url: string;

	constructor(base_url: string) {
		logger.info('Initializing with base URL:', base_url);

		if (!base_url) {
			throw new OBPErrorBase('Base URL for OBP requests is not defined.');
		}
		this.base_url = base_url;

		logger.info('Initialized.');
	}

	async get(endpoint: string, accessToken?: string): Promise<any> {
		logger.debug('GET', endpoint);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`;
		}
		const response = await fetch(`${this.base_url}${endpoint}`, {
			headers
		});

		const data = await response.json();

		if (!response.ok) {
			logger.error('Failed to fetch OBP data:', { statusText: response.statusText, data });

			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error fetching OBP data: ${response.statusText}`);
			}
		}

		logger.debug('Response from OBP', response.status, response.statusText);
		logger.debug('GET done');
		return data;
	}

	async post(endpoint: string, body: any, accessToken?: string): Promise<any> {
		logger.debug('POST', endpoint, body);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`;
		}
		const response = await fetch(`${this.base_url}${endpoint}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});

		const data = await response.json();

		if (!response.ok) {
			logger.error('Failed to post OBP data:', { statusText: response.statusText, data });

			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error posting OBP data: ${response.statusText}`);
			}
		}

		logger.debug('Response from OBP', response.status, response.statusText);
		logger.debug('POST done');
		return data;
	}

	async delete(endpoint: string, accessToken?: string): Promise<any> {
		logger.debug('DELETE', endpoint);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`;
		}
		const response = await fetch(`${this.base_url}${endpoint}`, {
			method: 'DELETE',
			headers
		});

		const data = await response.json();

		if (!response.ok) {
			logger.error('Failed to delete OBP data:', response.statusText, data);
			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error deleting OBP data: ${response.statusText}`);
			}
		}

		logger.debug('Response from OBP', response.status, response.statusText);
		logger.debug('DELETE done');
		return data;
	}

	async put(endpoint: string, body: any, accessToken?: string): Promise<any> {
		logger.debug('PUT', endpoint, body);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`;
		}
		const response = await fetch(`${this.base_url}${endpoint}`, {
			method: 'PUT',
			headers,
			body: JSON.stringify(body)
		});

		const data = await response.json();

		if (!response.ok) {
			logger.error('Failed to put OBP data:', { statusText: response.statusText, data });
			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error putting OBP data: ${response.statusText}`);
			}
		}

		logger.debug('Response from OBP', response.status, response.statusText);
		logger.debug('PUT done');
		return data;
	}

	async patch(endpoint: string, body: any, accessToken?: string): Promise<any> {
		logger.debug('PATCH', endpoint, body);
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (accessToken) {
			headers['Authorization'] = `Bearer ${accessToken}`;
		}
		const response = await fetch(`${this.base_url}${endpoint}`, {
			method: 'PATCH',
			headers,
			body: JSON.stringify(body)
		});

		const data = await response.json();

		if (!response.ok) {
			logger.error('Failed to patch OBP data:', { statusText: response.statusText, data });
			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error patching OBP data: ${response.statusText}`);
			}
		}

		logger.debug('Response from OBP', response.status, response.statusText);
		logger.debug('PATCH done');
		return data;
	}
}

let obp_requests_instance: OBPRequests | null = null;

export const obp_requests = {
	get instance(): OBPRequests {
		if (!obp_requests_instance) {
			obp_requests_instance = new OBPRequests(env.PUBLIC_OBP_BASE_URL);
		}
		return obp_requests_instance;
	},

	get: function (endpoint: string, accessToken?: string) {
		return this.instance.get(endpoint, accessToken);
	},

	post: function (endpoint: string, data: any, accessToken?: string) {
		return this.instance.post(endpoint, data, accessToken);
	},

	put: function (endpoint: string, data: any, accessToken?: string) {
		return this.instance.put(endpoint, data, accessToken);
	},

	delete: function (endpoint: string, accessToken?: string) {
		return this.instance.delete(endpoint, accessToken);
	}
};
