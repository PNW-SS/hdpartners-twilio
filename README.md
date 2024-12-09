# Twilio CI/CD Pipeline

This repository contains a CI/CD pipeline for deploying Twilio Functions and Studio Flows using GitHub Actions. The pipeline supports automatic deployments to development and production environments based on branch pushes.

## Prerequisites

1. Twilio Account
2. GitHub Account
3. Node.js 18.x or later

## Getting Started

### 1. Install Twilio CLI

```bash
npm install twilio-cli -g
twilio plugins:install @twilio-labs/plugin-serverless
```

### 2. Configure Twilio CLI

```bash
twilio login
```

## Project Structure

```
.
├── functions/
├── assets/
├── flows/
├── scripts/
└── package.json
```

## GitHub Actions Workflow Explanation

The workflow (`twilio-ci.yml`) automates the deployment process:

### Triggers

- Activates on pushes to `main` (production) and `dev` (development) branches

### Environment Selection

- Automatically determines environment based on branch:
  - `main` → production
  - `dev` → development

### Workflow Steps

1. **Checkout Repository**
   - Uses `actions/checkout@v2` to clone the repository

2. **Node.js Setup**
   - Installs Node.js 18.x
   - Includes caching for faster builds

3. **Dependencies Installation**
   - Uses `npm ci` for consistent installations

4. **Twilio Deployment**
   - Installs Twilio CLI and serverless plugin
   - Deploys functions based on environment:
     ```bash
     twilio serverless:deploy \
       --service-name=inventerra \
       --environment=$DEPLOY_ENV \
       --force
     ```

## Local Development

1. Clone the repository
```bash
git clone <repository-url>
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file with required environment variable
- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_API_KEY`: Twilio API Key
- `TWILIO_API_SECRET`: Twilio API Secret
- `JWT_SECRET`: JWT Secret for token generation
- `SUPABASE_API_KEY`: Supabase API Key
- `SUPABASE_URL`: Supabase URL
- `ACCOUNT_SID`: Twilio Account SID
- `TWILIO_NUMBER`: Twilio Phone Number
- `QUEUE_NAME`: Name of your Twilio Queue
- `AUTH_TOKEN`: Twilio Auth Token
- `SUMMARY_SERVICE_SID`: Summary Service SID
- `FALLBACK_NUMBER`: Fallback Phone Number
- `DISCORD_WEBHOOK_URL`: Discord Webhook URL
- `DEVELOPER_SUPPORT_NUMBER`: Developer Support Number
- `TWILIO_SERVER_URL`: Twilio Server URL

4. Run locally
```bash
twilio serverless:start
```

Or to handle external calls on local machine:
```bash
twilio serverless:start --ngrok=""
```

**Note:** Your ngrok URL will need to be entered under one of the development number's URL for calls and messaging (ask admin)

## Deployment Process

1. Push changes to `dev` branch for development deployment
2. Test changes in development environment
3. Merge to `main` branch for production deployment

## Troubleshooting

- Verify all GitHub secrets are properly set
- Check Twilio CLI authentication
- Review GitHub Actions logs for deployment errors

## Useful Documentation

- [Twilio Serverless Toolkit Documentation](https://www.twilio.com/docs/labs/serverless-toolkit)