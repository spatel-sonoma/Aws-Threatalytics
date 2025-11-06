export interface StripeWebhookEvent {
    type: string;
    data: {
        object: {
            id: string;
            customer?: string;
            subscription?: string;
            status?: string;
            [key: string]: any;
        };
    };
}