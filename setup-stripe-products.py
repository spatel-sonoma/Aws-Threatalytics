"""
Stripe Products and Prices Setup Script
Run this script to create the required products and prices in your Stripe account.
"""

import stripe
import os
from pathlib import Path

# Try to load from reactapp-main/.env
env_file = Path(__file__).parent / 'reactapp-main' / '.env'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

# Set your Stripe secret key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

if not stripe.api_key:
    print("❌ Error: STRIPE_SECRET_KEY not found in environment variables")
    print("Please add STRIPE_SECRET_KEY to reactapp-main/.env file")
    exit(1)

print("🔧 Setting up Stripe products and prices...")
print(f"Using Stripe account: {stripe.api_key[:7]}...")

# Define products
products = [
    {
        'name': 'Threatalytics Starter Plan',
        'description': '500 API requests per month with essential threat analysis features',
        'price': 29,
        'interval': 'month',
        'features': [
            '500 API requests/month',
            'All analysis types',
            'Email support',
            'Basic reports'
        ]
    },
    {
        'name': 'Threatalytics Professional Plan',
        'description': '5,000 API requests per month with advanced features',
        'price': 99,
        'interval': 'month',
        'features': [
            '5,000 API requests/month',
            'All analysis types',
            'Priority support',
            'Advanced reports',
            'Custom threat feeds',
            'API access'
        ]
    },
    {
        'name': 'Threatalytics Enterprise Plan',
        'description': 'Unlimited API requests with enterprise-grade features',
        'price': 499,
        'interval': 'month',
        'features': [
            'Unlimited API requests',
            'All Professional features',
            'Dedicated account manager',
            'Custom SLA',
            'On-premise deployment',
            'Advanced security',
            '24/7 phone support'
        ]
    }
]

created_prices = {}

try:
    for product_data in products:
        print(f"\n📦 Creating product: {product_data['name']}...")
        
        # Create product
        product = stripe.Product.create(
            name=product_data['name'],
            description=product_data['description'],
            metadata={
                'features': ', '.join(product_data['features'])
            }
        )
        
        print(f"✅ Product created: {product.id}")
        
        # Create price
        price = stripe.Price.create(
            product=product.id,
            unit_amount=product_data['price'] * 100,  # Convert to cents
            currency='usd',
            recurring={'interval': product_data['interval']}
        )
        
        print(f"✅ Price created: {price.id}")
        
        # Map to environment variable names
        plan_name = product_data['name'].split()[1].upper()  # STARTER, PROFESSIONAL, ENTERPRISE
        created_prices[f'VITE_STRIPE_PRICE_ID_{plan_name}'] = price.id

    # Print summary
    print("\n" + "="*60)
    print("✅ Stripe setup complete!")
    print("="*60)
    print("\nAdd these to your .env file:\n")
    
    for key, value in created_prices.items():
        print(f"{key}={value}")
    
    print("\n" + "="*60)
    print("\n📝 Next steps:")
    print("1. Copy the environment variables above")
    print("2. Add them to reactapp-main/.env file")
    print("3. Restart your React development server")
    print("4. The Upgrade Plan button will now work!")
    
except stripe.error.StripeError as e:
    print(f"\n❌ Stripe Error: {e}")
    print("\nPlease check:")
    print("1. Your STRIPE_SECRET_KEY is correct")
    print("2. You're using the right Stripe account (test/live)")
    print("3. Your Stripe account has the necessary permissions")
except Exception as e:
    print(f"\n❌ Error: {e}")
