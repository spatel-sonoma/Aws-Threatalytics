# AWS Credentials Setup Guide

## ❌ Current Error
```
Error: AWS credentials missing or invalid. Original error from AWS: Could not load credentials from any providers
```

## 🔑 Solution: Configure AWS Credentials

You need to set up AWS credentials so that the Serverless Framework can deploy to your AWS account.

---

## Method 1: AWS CLI Configuration (Recommended)

### Step 1: Install AWS CLI (if not installed)
Download from: https://aws.amazon.com/cli/

Or using PowerShell:
```powershell
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

### Step 2: Get Your AWS Access Keys

1. **Login to AWS Console**: https://console.aws.amazon.com/
2. **Go to IAM**: Search for "IAM" in the AWS Console
3. **Navigate to Users**: Click "Users" in the left sidebar
4. **Select Your User** (or create a new user if needed)
5. **Create Access Key**:
   - Click "Security credentials" tab
   - Scroll to "Access keys" section
   - Click "Create access key"
   - Choose "Command Line Interface (CLI)"
   - Download the CSV or copy:
     - **Access Key ID** (e.g., AKIAIOSFODNN7EXAMPLE)
     - **Secret Access Key** (e.g., wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY)

### Step 3: Configure AWS CLI
```powershell
aws configure
```

You'll be prompted to enter:
```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

### Step 4: Verify Configuration
```powershell
aws sts get-caller-identity
```

You should see:
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

---

## Method 2: Environment Variables (Alternative)

Set AWS credentials as environment variables in PowerShell:

```powershell
$env:AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
$env:AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
$env:AWS_REGION="us-east-1"
```

**Note:** These only last for the current PowerShell session.

---

## Method 3: AWS Credentials File (Manual)

Create/Edit: `C:\Users\Lenovo\.aws\credentials`

```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Create/Edit: `C:\Users\Lenovo\.aws\config`

```ini
[default]
region = us-east-1
output = json
```

---

## 🔒 IAM Permissions Required

Your AWS user needs these permissions for serverless deployment:

### Essential Permissions:
- CloudFormation (Full)
- S3 (Full)
- Lambda (Full)
- API Gateway (Full)
- IAM (Create/Update Roles)
- CloudWatch Logs (Full)
- DynamoDB (Full)
- Cognito (Full)
- SNS (Full)

### Quick Setup: Attach AWS Managed Policies

In IAM Console → Users → Your User → Permissions:

1. **AdministratorAccess** (Full access - easiest for development)
   
   OR for more restricted access:

2. **PowerUserAccess** (Most services except IAM)
   PLUS
3. **IAMFullAccess** (To create Lambda execution roles)

---

## 🧪 Test Deployment

After configuring credentials, test the deployment:

```powershell
# Test AWS connection
aws sts get-caller-identity

# Deploy serverless
serverless deploy
```

---

## 🚨 Troubleshooting

### Error: "Could not load credentials from any providers"
- ✅ Run `aws configure` and enter valid credentials
- ✅ Verify credentials file exists: `C:\Users\Lenovo\.aws\credentials`
- ✅ Check credentials are not expired

### Error: "Access Denied"
- ✅ Check IAM permissions (user needs CloudFormation, Lambda, API Gateway, S3 access)
- ✅ Verify user has `PowerUserAccess` or `AdministratorAccess` policy

### Error: "Region not set"
- ✅ Run `aws configure` and set region to `us-east-1`
- ✅ Or set environment variable: `$env:AWS_REGION="us-east-1"`

### Credentials file not found
- ✅ Manually create directory: `mkdir C:\Users\Lenovo\.aws`
- ✅ Create credentials file manually (see Method 3)

---

## 🔐 Security Best Practices

1. **Never commit credentials to Git**
   - Already in `.gitignore`: `.env`, `.aws/`

2. **Use IAM roles in production**
   - For EC2/Lambda, use IAM roles instead of access keys

3. **Rotate access keys regularly**
   - Create new keys every 90 days
   - Delete old keys after rotation

4. **Use least privilege**
   - Only grant permissions needed for deployment
   - Avoid using root account credentials

5. **Enable MFA**
   - Add multi-factor authentication to your IAM user

---

## 📋 Quick Checklist

Before running `serverless deploy`:

- [ ] AWS CLI installed
- [ ] AWS credentials configured (`aws configure`)
- [ ] Credentials verified (`aws sts get-caller-identity`)
- [ ] IAM user has required permissions
- [ ] Default region set to `us-east-1`
- [ ] Serverless Framework installed (`npm install -g serverless`)

---

## 🎯 Next Steps After Credentials Setup

1. **Configure AWS credentials** (follow Method 1 above)
2. **Run:** `serverless deploy`
3. **If successful**, proceed with authentication setup (AWS_SETUP_AUTHENTICATION.md)
4. **If errors**, check IAM permissions

---

## 💡 Example: Complete Setup Flow

```powershell
# Step 1: Configure AWS credentials
aws configure
# Enter your Access Key ID, Secret Key, region (us-east-1), format (json)

# Step 2: Verify credentials
aws sts get-caller-identity

# Step 3: Deploy serverless
cd E:\SONOMA\Aws-Threatalytics
serverless deploy

# Step 4: Note the API Gateway URL from deployment output
# Step 5: Update frontend with API URL
```

---

## 📞 Getting AWS Credentials

If you don't have AWS credentials yet:

1. **Create AWS Account**: https://aws.amazon.com/
2. **Sign in to AWS Console**: https://console.aws.amazon.com/
3. **Go to IAM**: https://console.aws.amazon.com/iam/
4. **Create User**:
   - Click "Users" → "Add users"
   - Username: `threatalytics-deploy`
   - Enable "Programmatic access"
   - Attach policy: `AdministratorAccess`
   - Download credentials CSV

---

**Current Status:** ⏳ Awaiting AWS Credentials Configuration

**Once configured, run:** `serverless deploy`
