# API Provider Backend - Render Deployment

This guide explains how to deploy the API Provider Backend to Render using Docker.

## Prerequisites

1. A [Render](https://render.com) account
2. This repository pushed to GitHub/GitLab
3. Environment variables configured

## Environment Variables

Configure these environment variables in your Render service:

### Required
- `PORT`: `3001` (or leave empty to use default)

### Optional (Redis Caching)
- `UPSTASH_REDIS_REST_URL`: Your Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis token

### Optional (Payment Gateway)
- `PAYMENT_GATEWAY_URL`: URL of your payment gateway service (default: `http://localhost:3002`)

## Deployment Steps

### 1. Create a New Web Service

1. Log into [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub/GitLab repository
4. Select the repository containing this code

### 2. Configure the Service

**Basic Settings:**
- **Name**: `api-provider-backend` (or your preferred name)
- **Root Directory**: `api-provider-backend`
- **Environment**: `Docker`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your deployment branch)

**Build Settings:**
- **Dockerfile Path**: `./Dockerfile` (auto-detected)
- **Docker Context**: `.` (current directory)

**Advanced Settings:**
- **Port**: `3001`
- **Health Check Path**: `/health`

### 3. Environment Variables

Add the following environment variables in the Render dashboard:

```env
PORT=3001
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
PAYMENT_GATEWAY_URL=https://your-payment-gateway.onrender.com
```

### 4. Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Build the Docker image
   - Deploy the container
   - Provide you with a public URL

## Docker Build Locally (Optional)

To test the Docker build locally:

```bash
# Build the image
docker build -t api-provider-backend .

# Run the container
docker run -p 3001:3001 \
  -e PORT=3001 \
  -e UPSTASH_REDIS_REST_URL=your_redis_url \
  -e UPSTASH_REDIS_REST_TOKEN=your_redis_token \
  api-provider-backend
```

## Health Check

The service includes a health check endpoint at `/health` that returns:

```json
{
  "uptime": 123.456,
  "message": "OK",
  "timestamp": 1640995200000,
  "proofSystemInitialized": true,
  "redisAvailable": true
}
```

## API Endpoints

Once deployed, your API will be available at:

- **Health Check**: `https://your-service.onrender.com/health`
- **Weather API**: `https://your-service.onrender.com/api/weather/:city`

Example usage:
```bash
curl -H "wallet-address: 0x1234..." \
  https://your-service.onrender.com/api/weather/london
```

## Troubleshooting

### Build Failures
- Check the build logs in Render dashboard
- Ensure all dependencies are listed in `package.json`
- Verify TypeScript compilation with `yarn build` locally

### Runtime Errors
- Check the service logs in Render dashboard
- Verify environment variables are set correctly
- Ensure health check endpoint returns 200 status

### Performance Optimization
- The service uses Node.js clustering automatically
- Redis is used for caching when configured
- Consider upgrading to a higher Render plan for better performance

## Cost Considerations

- **Free Tier**: Limited to 750 hours/month, spins down after 15 minutes of inactivity
- **Starter Plan** ($7/month): Always-on service, better for production
- **Standard Plan** ($25/month): More resources and better performance

## Security Notes

1. Never commit `.env` files to version control
2. Use Render's environment variable system for secrets
3. The Dockerfile runs as a non-root user for security
4. Consider enabling Render's DDoS protection for production

## Support

If you encounter issues:
1. Check Render's [documentation](https://render.com/docs)
2. Review the build and runtime logs
3. Verify your environment variables
4. Test the Docker build locally first