// Types for API requests and responses
export interface AnalysisRequest {
    content: string;
    mode?: 'analyze' | 'drill' | 'report' | 'redact';
}

export interface AnalysisResponse {
    result: string;
    threatLevel?: 'low' | 'medium' | 'high';
    recommendations?: string[];
    redactedContent?: string;
}

export interface ConversationData {
    id?: string;
    title: string;
    mode: string;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}

export interface SubscriptionData {
    status: string;
    plan: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    usage: {
        current: number;
        limit: number;
    };
}