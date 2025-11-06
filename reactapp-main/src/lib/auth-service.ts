import { API_CONFIG } from '@/config/api';

interface LoginResponse {
    user: {
        id: string;
        email: string;
        name?: string;
        subscription?: {
            plan: string;
            status: string;
        };
    };
    tokens: {
        access_token: string;
        refresh_token: string;
        id_token: string;
    };
}

interface AuthError {
    error: string;
    message: string;
}

class AuthService {
    private readonly BASE_URL = API_CONFIG.AUTH_BASE_URL;

    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await fetch(`${this.BASE_URL}/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'login',
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store tokens and user info
        localStorage.setItem('threatalytics_tokens', JSON.stringify(data.tokens));
        localStorage.setItem('threatalytics_user', JSON.stringify(data.user));
        localStorage.setItem('threatalytics_token_time', Date.now().toString());

        return data;
    }

    async signup(email: string, password: string, name?: string): Promise<void> {
        const response = await fetch(`${this.BASE_URL}/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'signup',
                email,
                password,
                name,
                auto_confirm: true
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Signup failed');
        }

        // After successful signup, automatically log in
        await this.login(email, password);
    }

    async logout(): Promise<void> {
        const tokens = localStorage.getItem('threatalytics_tokens');
        if (tokens) {
            try {
                const { refresh_token } = JSON.parse(tokens);
                await fetch(`${this.BASE_URL}/auth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'logout',
                        refresh_token
                    })
                });
            } catch (error) {
                console.error('Logout API call failed:', error);
            }
        }

        // Clear local storage
        localStorage.removeItem('threatalytics_tokens');
        localStorage.removeItem('threatalytics_user');
        localStorage.removeItem('threatalytics_token_time');
    }

    async refreshToken(): Promise<boolean> {
        const tokens = localStorage.getItem('threatalytics_tokens');
        if (!tokens) return false;

        try {
            const { refresh_token } = JSON.parse(tokens);
            const response = await fetch(`${this.BASE_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'refresh',
                    refresh_token
                })
            });

            const data = await response.json();

            if (!response.ok) {
                this.clearAuth();
                return false;
            }

            // Update tokens
            const currentTokens = JSON.parse(tokens);
            currentTokens.access_token = data.tokens.access_token;
            currentTokens.id_token = data.tokens.id_token;
            
            localStorage.setItem('threatalytics_tokens', JSON.stringify(currentTokens));
            localStorage.setItem('threatalytics_token_time', Date.now().toString());

            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuth();
            return false;
        }
    }

    isAuthenticated(): boolean {
        return !!localStorage.getItem('threatalytics_tokens');
    }

    getUser() {
        const user = localStorage.getItem('threatalytics_user');
        return user ? JSON.parse(user) : null;
    }

    private clearAuth() {
        localStorage.removeItem('threatalytics_tokens');
        localStorage.removeItem('threatalytics_user');
        localStorage.removeItem('threatalytics_token_time');
    }
}

export const authService = new AuthService();