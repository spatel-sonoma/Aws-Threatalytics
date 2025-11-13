export const API_CONFIG = {
    AUTH_BASE_URL: 'https://authapi.threatalyticsai.com',
    API_BASE_URL: 'https://api.threatalyticsai.com',
    ADMIN_BASE_URL: 'https://api.threatalyticsai.com/admin'
};

export const ENDPOINTS = {
    // ✅ Live Core Analysis Endpoints
    analysis: {
        analyze: '/analyze',          // ✅ Live - Threat analysis with GPT-4
        redact: '/redact',           // ✅ Live - PII redaction
        generateReport: '/generate-report', // ✅ Live - Generate security reports
        simulateDrill: '/simulate-drill'   // ✅ Live but has 504 Timeout Error
    },

    // ❌ Not Live - Authentication Endpoints
    auth: {
        base: '/auth',
        actions: {
            signup: 'signup',         // User registration with Cognito
            login: 'login',          // User authentication
            refresh: 'refresh',       // Token renewal
            logout: 'logout',        // Session termination
            verifyCode: 'verify_code',// Email verification
            resendCode: 'resend_code' // Resend verification email
        }
    },

    // ❌ Not Live - Conversation Management
    conversations: {
        list: '/conversations',      // GET - List all user conversations
        create: '/conversations',    // POST - Save new conversation
        delete: (id: string) => `/conversations/${id}` // DELETE - Delete conversation
    },

    // ❌ Not Live - Subscription Management
    subscription: {
        status: '/subscription/status',  // GET - Check subscription status
        create: '/subscription/create',  // POST - Create Stripe checkout session
        portal: '/subscription/portal',  // GET - Access billing portal
        cancel: '/subscription/cancel',  // POST - Cancel subscription
        webhook: '/stripe/webhook'       // ✅ Live - Handle Stripe payment events
    },

    // Usage Tracking
    usage: {
        get: '/usage',                  // GET - Get current usage stats
        track: '/usage/track',          // POST - Track API usage
        history: '/usage/history'       // GET - Get usage history
    },

    // Admin Dashboard - Mixed Status
    admin: {
        stats: '/admin/dashboard/stats',  // ❌ Not Live - Dashboard statistics
        users: {
            list: '/admin/users',         // ✅ Live - List all users
            recent: '/admin/users/recent', // ✅ Live - Recent users list
            export: '/admin/users/export'  // ✅ Live - Export users CSV
        },
        charts: {
            revenue: '/admin/charts/revenue', // ❌ Not Live - Revenue chart data
            usage: '/admin/charts/usage'      // ❌ Not Live - API usage analytics
        }
    },
    chat: {
        send: '/chat/message',
        history: '/chat/history',
        delete: '/chat/delete'
    },
    user: {
        profile: '/user/profile',
        subscription: '/user/subscription'
    }
};