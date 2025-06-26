import type { RequestEvent } from '@sveltejs/kit';

export async function load(event: RequestEvent ) {
    const { cookies } = event;

    const consumerDataCookie = cookies.get('consumer_data');
    console.log("Consumer Data Cookie:", consumerDataCookie);

    if (consumerDataCookie) {

        cookies.delete('consumer_data', { path: '/' });
        
        try {
            const consumerData = JSON.parse(consumerDataCookie);
            
            console.log("Parsed Consumer Data:", consumerData);
            
            return {
                consumerData
            }
        } catch (error) {
            console.error("Failed to parse consumer data cookie:", error);
            return {
                error: "Failed to parse consumer data cookie."
            };
        }
        
    }

    return {
        consumerData: null
    }
}