import { OBP_BASE_URL } from '$env/static/private';

class OBPRequests {
    base_url: string;

    constructor(base_url: string) {
        console.group("--------------OBPRequests----------------");
        this.base_url = base_url

        console.log("OBPRequests initialized.");
        console.groupEnd();
    }

    async get(endpoint: string, accessToken: string): Promise<any> {
        console.group("--------------OBPRequests----------------");
        console.debug("GET ", endpoint);
        const response = await fetch(`${OBP_BASE_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error("Failed to fetch OBP data:", response.statusText);
            throw new Error(`Error fetching OBP data: ${response.statusText}`);
        }

        const data = await response.json();
        console.debug(`Response from OBP:\n`, response.status, response.statusText);
        console.groupEnd();
        return data;
    }
}

export const obp_requests = new OBPRequests(OBP_BASE_URL);