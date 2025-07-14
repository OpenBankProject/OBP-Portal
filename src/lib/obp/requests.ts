import { env } from '$env/dynamic/public';
import { OBPErrorBase, OBPRequestError } from '$lib/obp/errors';

class OBPRequests {
	base_url: string;

	constructor(base_url: string) {
		console.log(`${this.constructor.name}: `);
		console.log('Initializing OBPRequests with base URL:', base_url);

		if (!base_url) {
			throw new OBPErrorBase('Base URL for OBP requests is not defined.');
		}
		this.base_url = base_url;

		console.log('OBPRequests initialized.');
	}

	async get(endpoint: string, accessToken?: string): Promise<any> {
		console.log(`--------------------------------\n${this.constructor.name}: `);
		console.debug('GET ', endpoint);
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
			console.error('Failed to fetch OBP data:', { statusText: response.statusText, data });

			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error fetching OBP data: ${response.statusText}`);
			}
		}

		console.debug(`Response from OBP:\n`, response.status, response.statusText);
		console.log(`--------------------------------`);
		return data;
	}

	async post(endpoint: string, body: any, accessToken?: string): Promise<any> {
		console.log(`${this.constructor.name}: `);
		console.debug('POST ', endpoint, body);
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
			console.error('Failed to post OBP data:', { statusText: response.statusText, data });

			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error posting OBP data: ${response.statusText}`);
			}
		}

		console.debug(`Response from OBP:\n`, response.status, response.statusText);
		console.log(`--------------------------------`);
		return data;
	}

	async delete(endpoint: string, accessToken?: string): Promise<any> {
		console.log(`${this.constructor.name}: `);
		console.debug('DELETE ', endpoint);
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
			console.error('Failed to delete OBP data:', response.statusText, data);
			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error deleting OBP data: ${response.statusText}`);
			}
		}

		console.debug(`Response from OBP:\n`, response.status, response.statusText);
		console.log(`--------------------------------`);
		return data;
	}

	async put(endpoint: string, body: any, accessToken?: string): Promise<any> {
		console.log(`${this.constructor.name}: `);
		console.debug('PUT ', endpoint, body);
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
			console.error('Failed to put OBP data:', { statusText: response.statusText, data });
			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error putting OBP data: ${response.statusText}`);
			}
		}

		console.debug(`Response from OBP:\n`, response.status, response.statusText);
		console.log(`--------------------------------`);
		return data;
	}

	async patch(endpoint: string, body: any, accessToken?: string): Promise<any> {
		console.log(`${this.constructor.name}: `);
		console.debug('PATCH ', endpoint, body);
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
			console.error('Failed to patch OBP data:', { statusText: response.statusText, data });
			if (data && data.code && data.message) {
				throw new OBPRequestError(data.code, data.message);
			} else {
				throw new OBPErrorBase(`Error patching OBP data: ${response.statusText}`);
			}
		}

		console.debug(`Response from OBP:\n`, response.status, response.statusText);
		console.log(`--------------------------------`);
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
