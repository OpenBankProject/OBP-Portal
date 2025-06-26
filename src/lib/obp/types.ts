export interface OBPConsent {
    consent_reference_id: string;
    consent_id: string;
    consumer_id: string;
    created_by_user_id: string;
    status: string;
    last_action_date: string;
    last_usage_date: string;
    jwt: string;
    jwt_payload: {
        createdByUserId: string;
        sub: string;
        iss: string;
        aud: string;
        jti: string;
        iat: number;
        nbf: number;
        exp: number;
        request_headers: any[];
        entitlements: any[];
        views: any[];
    };
    api_standard: string;
    api_version: string;
}

export interface OBPConsumerRequestBody {
    app_type: 'public' | 'confidential',
    app_name: string,
    redirect_url: string,
    developer_email: string,
    description: string,
    company: string
    enabled: boolean
}