import { PUBLIC_OBP_BASE_URL } from '$env/static/public';
import { OBPErrorBase, OBPRequestError } from '$lib/obp/errors';

class OBPRequests {
    base_url: string;

    constructor(base_url: string) {
        console.log(`${this.constructor.name}: `);
        if (!base_url) {
            throw new OBPErrorBase("Base URL for OBP requests is not defined.");
        }
        this.base_url = base_url

        console.log("OBPRequests initialized.");
        
    }

    async get(endpoint: string, accessToken: string): Promise<any> {
        console.log(`--------------------------------\n${this.constructor.name}: `);
        console.debug("GET ", endpoint);
        const response = await fetch(`${this.base_url}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Failed to fetch OBP data:", { statusText: response.statusText, data });
            
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

    async post(endpoint: string, accessToken: string, body: any): Promise<any> {
        console.log(`${this.constructor.name}: `);
        console.debug("POST ", endpoint, body);
        const response = await fetch(`${this.base_url}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Failed to post OBP data:", { statusText: response.statusText, data });
            
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

    async delete(endpoint: string, accessToken: string): Promise<any> {
        console.log(`${this.constructor.name}: `);
        console.debug("DELETE ", endpoint);
        const response = await fetch(`${this.base_url}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });


        const data = await response.json();

        if (!response.ok) {
            console.error("Failed to delete OBP data:", response.statusText, data);
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

    async put(endpoint: string, accessToken: string, body: any): Promise<any> {
        console.log(`${this.constructor.name}: `);
        console.debug("PUT ", endpoint, body);
        const response = await fetch(`${this.base_url}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Failed to put OBP data:", { statusText: response.statusText, data });
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

    async patch(endpoint: string, accessToken: string, body: any): Promise<any> {
        console.log(`${this.constructor.name}: `);
        console.debug("PATCH ", endpoint, body);
        const response = await fetch(`${this.base_url}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Failed to patch OBP data:", { statusText: response.statusText, data });
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

export const obp_requests = new OBPRequests(PUBLIC_OBP_BASE_URL);