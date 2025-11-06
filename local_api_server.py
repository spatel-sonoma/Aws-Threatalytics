"""
Local API Server for Testing Lambda Functions
Simulates API Gateway locally
Run: python local_api_server.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import sys
import os
sys.path.append('./lambda_functions')

# Import all lambda handlers
try:
    from admin_auth import lambda_handler as admin_auth_handler
    from analyze import lambda_handler as analyze_handler
    from redact import lambda_handler as redact_handler
    from report import lambda_handler as report_handler
    from drill import lambda_handler as drill_handler
    from usage_tracker import lambda_handler as usage_handler
    from subscription_manager import lambda_handler as subscription_handler
    print("✅ All Lambda handlers loaded successfully")
except ImportError as e:
    print(f"❌ Error loading handlers: {e}")
    print("Make sure all lambda_functions/*.py files exist")
    sys.exit(1)

class LocalAPIHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Custom logging format"""
        print(f"[{self.log_date_time_string()}] {format % args}")
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            html = """
            <html>
            <head><title>Threatalytics Local API</title></head>
            <body style="font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff;">
                <h1>🛡️ Threatalytics Local API Server</h1>
                <p>Server is running! Available endpoints:</p>
                <ul>
                    <li><code>POST /admin/auth</code> - Admin authentication</li>
                    <li><code>POST /analyze</code> - Threat analysis</li>
                    <li><code>POST /redact</code> - PII redaction</li>
                    <li><code>POST /report</code> - Generate reports</li>
                    <li><code>POST /drill</code> - Simulate drills</li>
                    <li><code>POST /usage</code> - Usage tracking</li>
                    <li><code>POST /subscription</code> - Subscription management</li>
                </ul>
                <h3>Test Commands:</h3>
                <pre>
# Test Admin Login
curl -X POST http://localhost:8000/admin/auth \\
  -H "Content-Type: application/json" \\
  -d '{"action":"login","email":"admin@threatalyticsai.com","password":"admin123"}'

# Test Usage Tracker
curl -X POST http://localhost:8000/usage \\
  -H "Content-Type: application/json" \\
  -d '{"action":"get","user_id":"test-123"}'
                </pre>
            </body>
            </html>
            """
            self.wfile.write(html.encode())
        else:
            self.send_error(404, 'Use POST for API endpoints')
    
    def do_POST(self):
        """Handle POST requests"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            
            print(f"\n📨 Request to {self.path}")
            print(f"Body: {body[:200]}..." if len(body) > 200 else f"Body: {body}")
            
            # Create Lambda event
            event = {
                'body': body,
                'headers': dict(self.headers),
                'httpMethod': 'POST',
                'path': self.path
            }
            
            # Route to correct handler
            handlers = {
                '/admin/auth': admin_auth_handler,
                '/analyze': analyze_handler,
                '/redact': redact_handler,
                '/report': report_handler,
                '/drill': drill_handler,
                '/usage': usage_handler,
                '/subscription': subscription_handler
            }
            
            handler = handlers.get(self.path)
            
            if handler:
                # Call Lambda handler
                response = handler(event, None)
                
                # Send response
                self.send_response(response.get('statusCode', 200))
                
                # Send CORS headers
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                
                # Write response body
                response_body = response.get('body', '{}')
                self.wfile.write(response_body.encode())
                
                print(f"✅ Response: {response['statusCode']}")
            else:
                self.send_error(404, f'Endpoint not found: {self.path}')
                print(f"❌ Unknown endpoint: {self.path}")
                
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_response = json.dumps({
                'error': str(e),
                'message': 'Internal server error'
            })
            self.wfile.write(error_response.encode())
    
    def do_OPTIONS(self):
        """Handle preflight CORS requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key')
        self.end_headers()

def main():
    port = 8000
    server_address = ('', port)
    
    print("\n" + "=" * 70)
    print("🚀 Threatalytics Local API Server")
    print("=" * 70)
    print(f"\n✅ Server running on http://localhost:{port}")
    print("\n📋 Available Endpoints:")
    print(f"   • POST http://localhost:{port}/admin/auth")
    print(f"   • POST http://localhost:{port}/analyze")
    print(f"   • POST http://localhost:{port}/redact")
    print(f"   • POST http://localhost:{port}/report")
    print(f"   • POST http://localhost:{port}/drill")
    print(f"   • POST http://localhost:{port}/usage")
    print(f"   • POST http://localhost:{port}/subscription")
    print("\n🔧 Environment Variables:")
    print(f"   OPENAI_API_KEY: {'✅ Set' if os.environ.get('OPENAI_API_KEY') else '❌ Not set'}")
    print(f"   STRIPE_SECRET_KEY: {'✅ Set' if os.environ.get('STRIPE_SECRET_KEY') else '❌ Not set'}")
    print(f"   ADMIN_SECRET_KEY: {'✅ Set' if os.environ.get('ADMIN_SECRET_KEY') else '❌ Not set'}")
    print("\n💡 Quick Test Commands:")
    print("   PowerShell:")
    print('   $body = @{action="login";email="admin@threatalyticsai.com";password="admin123"} | ConvertTo-Json')
    print(f'   Invoke-RestMethod -Uri "http://localhost:{port}/admin/auth" -Method POST -Body $body -ContentType "application/json"')
    print("\n⌨️  Press Ctrl+C to stop the server")
    print("=" * 70 + "\n")
    
    httpd = HTTPServer(server_address, LocalAPIHandler)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped")
        httpd.server_close()

if __name__ == '__main__':
    main()
