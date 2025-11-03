// Authentication Manager
class AuthManager {
    constructor() {
        this.API_BASE_URL = 'https://authapi.threatalyticsai.com';
        this.user = null;
        this.tokens = null;
        this.init();
    }

    init() {
        // Check for verification link parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('verify') && urlParams.has('code')) {
            this.handleVerificationLink(urlParams.get('code'));
            // Remove verification parameters from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        // Load user session from localStorage
        const storedUser = localStorage.getItem('threatalytics_user');
        const storedTokens = localStorage.getItem('threatalytics_tokens');
        
        if (storedUser && storedTokens) {
            this.user = JSON.parse(storedUser);
            this.tokens = JSON.parse(storedTokens);
            this.updateUI();
            
            // Check if token needs refresh
            this.refreshTokenIfNeeded();
        } else {
            // No stored session, show login modal
            this.showAuthModal();
        }
    }

    async handleVerificationLink(code) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'confirm_verification',
                    code
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Show success message
            this.showMessage('Email verified successfully! You can now log in.', 'success');
            
            // Show login modal after successful verification
            setTimeout(() => {
                this.showAuthModal('login');
            }, 1000);

        } catch (error) {
            this.showMessage(error.message, 'error');
            // Show login modal after error
            setTimeout(() => {
                this.showAuthModal('login');
            }, 2000);
        }
    }

    async signup(email, password, name) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'signup',
                    email,
                    password,
                    name,
                    auto_confirm: true  // Add this flag to auto-confirm users
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            // Show success message
            this.showMessage('Account created successfully! You can now log in.', 'success');
            
            // Show login modal after successful signup
            setTimeout(() => {
                this.showAuthModal('login');
            }, 1500);

            return data;
        } catch (error) {
            throw error;
        }
    }

    async verifyCode(email, code) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'verify_code',
                    email,
                    code
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Hide verification modal
            document.getElementById('verificationCodeModal')?.classList.remove('show');
            this.showMessage('Email verified successfully! You can now log in.', 'success');

            // Show login modal
            setTimeout(() => {
                this.showAuthModal('login');
            }, 1500);

            return data;
        } catch (error) {
            this.showMessage(error.message, 'error');
            throw error;
        }
    }

    showVerificationCodeModal(email) {
        // Create verification modal if it doesn't exist
        let verificationModal = document.getElementById('verificationCodeModal');
        if (!verificationModal) {
            verificationModal = document.createElement('div');
            verificationModal.id = 'verificationCodeModal';
            verificationModal.classList.add('modal');
            verificationModal.innerHTML = `
                <div class="modal-content">
                    <h2>Enter Verification Code</h2>
                    <div class="verification-message">
                        <p>We've sent a verification code to:</p>
                        <p class="email">${email}</p>
                        <div class="code-input">
                            <input type="text" id="verificationCode" placeholder="Enter verification code" 
                                maxlength="6" pattern="[0-9]*" inputmode="numeric">
                        </div>
                        <div class="instructions">
                            <p>✓ Check your email for the verification code</p>
                            <p>✓ Enter the 6-digit code above</p>
                            <p>✓ Click verify to complete registration</p>
                        </div>
                    </div>
                    <div class="actions">
                        <button onclick="authManager.verifyCode('${email}', document.getElementById('verificationCode').value)">
                            Verify Code
                        </button>
                        <button onclick="authManager.resendVerificationCode('${email}')" class="secondary">
                            Resend Code
                        </button>
                    </div>
                    <p class="note">Didn't receive the code? Check your spam folder or click resend.</p>
                </div>
            `;
            document.body.appendChild(verificationModal);

            // Add styles if not already present
            if (!document.getElementById('verificationCodeStyles')) {
                const style = document.createElement('style');
                style.id = 'verificationCodeStyles';
                style.textContent = `
                    #verificationCodeModal {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.8);
                        z-index: 1000;
                    }
                    #verificationCodeModal.show {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    #verificationCodeModal .modal-content {
                        background: #1a1a1a;
                        padding: 30px;
                        border-radius: 12px;
                        text-align: center;
                        max-width: 500px;
                        width: 90%;
                    }
                    #verificationCodeModal h2 {
                        color: #e0e0e0;
                        margin-bottom: 20px;
                    }
                    #verificationCodeModal .email {
                        color: #ff7b1c;
                        font-weight: bold;
                        margin: 10px 0;
                        padding: 10px;
                        background: #2d2d2d;
                        border-radius: 6px;
                    }
                    #verificationCodeModal .code-input {
                        margin: 20px 0;
                    }
                    #verificationCodeModal .code-input input {
                        width: 200px;
                        padding: 15px;
                        font-size: 24px;
                        text-align: center;
                        letter-spacing: 8px;
                        border: 2px solid #3d3d3d;
                        border-radius: 6px;
                        background: #2d2d2d;
                        color: #e0e0e0;
                    }
                    #verificationCodeModal .instructions {
                        margin: 20px 0;
                        padding: 15px;
                        background: #2d2d2d;
                        border-radius: 8px;
                        text-align: left;
                    }
                    #verificationCodeModal .instructions p {
                        color: #e0e0e0;
                        margin: 8px 0;
                    }
                    #verificationCodeModal .actions {
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                        margin-top: 20px;
                    }
                    #verificationCodeModal button {
                        background: linear-gradient(135deg, #d85a00 0%, #ff7b1c 100%);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                    }
                    #verificationCodeModal button.secondary {
                        background: #3d3d3d;
                    }
                    #verificationCodeModal .note {
                        color: #888;
                        font-size: 14px;
                        margin-top: 15px;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        // Update email in existing modal if needed
        verificationModal.querySelector('.email').textContent = email;

        // Show the modal
        verificationModal.classList.add('show');
    }

    async resendVerificationCode(email) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'resend_code',
                    email
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend verification code');
            }

            this.showMessage('New verification code sent! Please check your email.', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }
    

    showVerificationModal(email) {
        // Create verification modal if it doesn't exist
        let verificationModal = document.getElementById('verificationModal');
        if (!verificationModal) {
            verificationModal = document.createElement('div');
            verificationModal.id = 'verificationModal';
            verificationModal.classList.add('modal');
            verificationModal.innerHTML = `
                <div class="modal-content">
                    <h2>Email Verification Required</h2>
                    <div class="verification-message">
                        <p>We've sent a verification link to:</p>
                        <p class="email">${email}</p>
                        <p>Please check your email and click the verification link to activate your account.</p>
                        <div class="instructions">
                            <p>✓ Check your inbox and spam folder</p>
                            <p>✓ Click the verification link in the email</p>
                            <p>✓ Return here to log in after verification</p>
                        </div>
                    </div>
                    <div class="actions">
                        <button onclick="authManager.resendVerification('${email}')">Resend Verification Email</button>
                        <button onclick="document.getElementById('verificationModal').classList.remove('show')" class="secondary">Close</button>
                    </div>
                    <p class="note">Can't find the email? Check your spam folder or click resend.</p>
                </div>
            `;
            document.body.appendChild(verificationModal);

            // Add styles if not already present
            if (!document.getElementById('verificationStyles')) {
                const style = document.createElement('style');
                style.id = 'verificationStyles';
                style.textContent = `
                    #verificationModal {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.8);
                        z-index: 1000;
                    }
                    #verificationModal.show {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    #verificationModal .modal-content {
                        background: #1a1a1a;
                        padding: 30px;
                        border-radius: 12px;
                        text-align: center;
                        max-width: 500px;
                        width: 90%;
                    }
                    #verificationModal h2 {
                        color: #e0e0e0;
                        margin-bottom: 20px;
                    }
                    #verificationModal .verification-message {
                        margin: 20px 0;
                        text-align: left;
                    }
                    #verificationModal .email {
                        color: #ff7b1c;
                        font-weight: bold;
                        margin: 10px 0;
                        padding: 10px;
                        background: #2d2d2d;
                        border-radius: 6px;
                        text-align: center;
                    }
                    #verificationModal .instructions {
                        margin: 20px 0;
                        padding: 15px;
                        background: #2d2d2d;
                        border-radius: 8px;
                    }
                    #verificationModal .instructions p {
                        color: #e0e0e0;
                        margin: 8px 0;
                    }
                    #verificationModal .actions {
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                        margin-top: 20px;
                    }
                    #verificationModal button {
                        background: linear-gradient(135deg, #d85a00 0%, #ff7b1c 100%);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                    }
                    #verificationModal button.secondary {
                        background: #3d3d3d;
                    }
                    #verificationModal .note {
                        color: #888;
                        font-size: 14px;
                        margin-top: 15px;
                    }
                    #verificationModal p {
                        color: #888;
                        margin-bottom: 10px;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        // Show the modal
        verificationModal.classList.add('show');
    }

    async resendVerification(email) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'resend_verification',
                    email
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend verification email');
            }

            this.showMessage('Verification email sent successfully! Please check your inbox.', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    showMessage(message, type = 'info') {
        // Create toast message container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1001;
            `;
            document.body.appendChild(toastContainer);
        }

        // Create toast message
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = message;
        toast.style.cssText = `
            background: ${type === 'success' ? '#4cd964' : type === 'error' ? '#ff3b30' : '#ff7b1c'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            margin-bottom: 10px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
        `;

        toastContainer.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);

        // Add animation styles if not already present
        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth`, {
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

            // Store user and tokens
            this.user = data.user;
            this.tokens = data.tokens;
            
            localStorage.setItem('threatalytics_user', JSON.stringify(this.user));
            localStorage.setItem('threatalytics_tokens', JSON.stringify(this.tokens));
            localStorage.setItem('threatalytics_token_time', Date.now());

            this.updateUI();
            return data;
        } catch (error) {
            throw error;
        }
    }

    async refreshToken() {
        if (!this.tokens || !this.tokens.refresh_token) {
            return false;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'refresh',
                    refresh_token: this.tokens.refresh_token
                })
            });

            const data = await response.json();

            if (!response.ok) {
                this.logout();
                return false;
            }

            // Update tokens
            this.tokens.access_token = data.tokens.access_token;
            this.tokens.id_token = data.tokens.id_token;
            
            localStorage.setItem('threatalytics_tokens', JSON.stringify(this.tokens));
            localStorage.setItem('threatalytics_token_time', Date.now());

            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
            return false;
        }
    }

    async refreshTokenIfNeeded() {
        const tokenTime = localStorage.getItem('threatalytics_token_time');
        if (!tokenTime) return;

        const elapsed = Date.now() - parseInt(tokenTime);
        const fiftyMinutes = 50 * 60 * 1000; // Refresh before 1 hour expiry

        if (elapsed > fiftyMinutes) {
            await this.refreshToken();
        }

        // Schedule next check
        setTimeout(() => this.refreshTokenIfNeeded(), 5 * 60 * 1000); // Check every 5 minutes
    }

    async logout() {
        if (this.tokens && this.tokens.access_token) {
            try {
                await fetch(`${this.API_BASE_URL}/auth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'logout',
                        access_token: this.tokens.access_token
                    })
                });
            } catch (error) {
                console.error('Logout API call failed:', error);
            }
        }

        // Clear local data
        this.user = null;
        this.tokens = null;
        localStorage.removeItem('threatalytics_user');
        localStorage.removeItem('threatalytics_tokens');
        localStorage.removeItem('threatalytics_token_time');
        
        // Show auth modal immediately
        this.showAuthModal();
        
        // Clear the chat and reset UI
        if (typeof newChat === 'function') {
            newChat();
        }
    }

    isAuthenticated() {
        return this.user !== null && this.tokens !== null;
    }

    getAccessToken() {
        return this.tokens ? this.tokens.access_token : null;
    }

    updateUI() {
        if (this.isAuthenticated()) {
            // Update user info in sidebar
            document.querySelector('.user-name').textContent = this.user.name || 'User';
            document.querySelector('.user-plan').textContent = (this.user.plan || 'free').toUpperCase();
            
            // Show/hide elements
            document.getElementById('authModal')?.classList.remove('show');
            document.body.classList.add('authenticated');
        } else {
            // Show login modal
            document.body.classList.remove('authenticated');
            this.showAuthModal();
        }
    }

    showAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('show');
        }
    }
}

// Conversation Manager
class ConversationManager {
    constructor(authManager) {
        this.authManager = authManager;
        this.API_BASE_URL = 'https://authapi.threatalyticsai.com';
        this.currentConversationId = null;
        this.conversations = [];
    }

    async loadConversations() {
        if (!this.authManager.isAuthenticated()) {
            return [];
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/conversations`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authManager.getAccessToken()}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.conversations = data.conversations || [];
                this.updateConversationsList();
                return this.conversations;
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }

        return [];
    }

    async saveConversation(mode, messages, title = null) {
        if (!this.authManager.isAuthenticated()) {
            return null;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authManager.getAccessToken()}`
                },
                body: JSON.stringify({
                    conversation_id: this.currentConversationId,
                    mode,
                    messages,
                    title: title || `${mode.charAt(0).toUpperCase() + mode.slice(1)} - ${new Date().toLocaleString()}`
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentConversationId = data.conversation_id;
                await this.loadConversations(); // Refresh list
                return data.conversation_id;
            }
        } catch (error) {
            console.error('Failed to save conversation:', error);
        }

        return null;
    }

    async deleteConversation(conversationId) {
        if (!this.authManager.isAuthenticated()) {
            return false;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authManager.getAccessToken()}`
                }
            });

            if (response.ok) {
                await this.loadConversations(); // Refresh list
                return true;
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }

        return false;
    }

    updateConversationsList() {
        const recentSection = document.querySelector('.nav-section:last-child .nav-item:not(:first-child)');
        
        // Clear existing conversation items (keep the "Recent Conversations" title)
        const container = recentSection?.parentElement;
        if (!container) return;

        // Remove old conversation items
        const oldItems = container.querySelectorAll('.nav-item:not(:first-child)');
        oldItems.forEach(item => item.remove());

        // Add new conversation items
        this.conversations.slice(0, 10).forEach(conv => {
            const item = document.createElement('div');
            item.className = 'nav-item';
            item.innerHTML = `
                <span class="icon">${this.getModeIcon(conv.mode)}</span>
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${conv.title}</span>
                <span class="delete-conv" onclick="conversationManager.deleteConversation('${conv.conversation_id}')" style="color:#ff4444; cursor:pointer;">×</span>
            `;
            item.onclick = (e) => {
                if (!e.target.classList.contains('delete-conv')) {
                    this.loadConversation(conv);
                }
            };
            container.appendChild(item);
        });
    }

    getModeIcon(mode) {
        const icons = {
            'analyze': '🔍',
            'redact': '🔒',
            'report': '📊',
            'drill': '🎯'
        };
        return icons[mode] || '💬';
    }

    async loadConversation(conversation) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/conversations/${conversation.conversation_id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authManager.getAccessToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load conversation');
            }

            const data = await response.json();
            const messages = data.messages || [];

            // Clear current chat
            document.getElementById('chatMessages').innerHTML = '';

            // Update conversation ID and mode
            this.currentConversationId = conversation.conversation_id;
            currentMode = conversation.mode;
            
            // Update UI mode
            switchMode(conversation.mode);

            // Display messages
            messages.forEach(msg => {
                addMessage(msg.content, msg.role === 'user');
            });

            // Update active state in sidebar
            this.updateConversationsList();

            return true;
        } catch (error) {
            console.error('Failed to load conversation:', error);
            return false;
        }
    }
}

// Initialize on page load
let authManager, conversationManager;

document.addEventListener('DOMContentLoaded', function() {
    authManager = new AuthManager();
    conversationManager = new ConversationManager(authManager);
    
    if (authManager.isAuthenticated()) {
        // Load conversations immediately after authentication
        conversationManager.loadConversations().then(() => {
            // If there are conversations, load the most recent one
            if (conversationManager.conversations.length > 0) {
                conversationManager.loadConversation(conversationManager.conversations[0]);
            }
        });
    }
});
