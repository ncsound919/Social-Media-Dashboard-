# Integration Guide

This guide covers how to set up every external dependency for the Social Ops Studio marketing engine.

---

## Table of Contents

1. [Self-hosting Authelia](#1-self-hosting-authelia)
2. [Installing and running OpenCode](#2-installing-and-running-opencode)
3. [Registering developer apps on each platform](#3-registering-developer-apps)
4. [Starting the Celery worker and beat scheduler](#4-celery-worker--beat-scheduler)
5. [Docker Compose quickstart](#5-docker-compose-quickstart)

---

## 1. Self-hosting Authelia

[Authelia](https://www.authelia.com/) is a self-hosted identity provider that handles OAuth 2.0 / OIDC for the dashboard.

### Prerequisites

- Docker or a Linux server
- A domain with HTTPS (e.g. `auth.your-domain.example.com`)

### Steps

1. **Copy the Authelia configuration**

   ```bash
   mkdir -p /etc/authelia
   cp src/config/authelia.yml.example /etc/authelia/configuration.yml
   ```

2. **Edit the configuration**

   Open `/etc/authelia/configuration.yml` and replace every placeholder:
   - `your-domain.example.com` → your actual domain
   - `a_very_long_and_random_secret_change_me` → a strong random secret (use `openssl rand -hex 32`)
   - Generate an RSA private key for the OIDC issuer:

     ```bash
     openssl genrsa -out /etc/authelia/private.pem 4096
     ```

   - Replace the `-----BEGIN RSA PRIVATE KEY-----` placeholder with the key contents.

3. **Create a users database**

   Create `/etc/authelia/users_database.yml`:

   ```yaml
   users:
     admin:
       displayname: "Admin User"
       password: "$argon2id$..."   # generate with: authelia crypto hash generate argon2
       email: admin@your-domain.example.com
       groups:
         - admins
     editor:
       displayname: "Editor User"
       password: "$argon2id$..."
       email: editor@your-domain.example.com
       groups:
         - editors
   ```

4. **Run Authelia with Docker**

   ```bash
   docker run -d \
     --name authelia \
     -v /etc/authelia:/config \
     -p 9091:9091 \
     authelia/authelia:latest
   ```

5. **Set environment variables** in `social_ops_studio/.env.local`:

   ```env
   AUTHELIA_URL=https://auth.your-domain.example.com
   AUTHELIA_CLIENT_ID=social-ops-studio
   AUTHELIA_CLIENT_SECRET=<the secret you set in authelia.yml for social-ops-studio>
   NEXTAUTH_URL=https://your-domain.example.com
   NEXTAUTH_SECRET=<random 32-byte hex>
   ```

---

## 2. Installing and running OpenCode

[OpenCode](https://github.com/sst/opencode) is an open-source LLM CLI/API that powers AI features.

### Installation

```bash
# Using npm (requires Node.js 18+)
npm install -g opencode-ai

# Or via the install script
curl -fsSL https://opencode.ai/install | bash
```

### Running locally

```bash
# Start the OpenCode server on the default port (4096)
opencode serve --port 4096
```

### Configuration

Set the following in `social_ops_studio/.env.local`:

```env
OPENCODE_API_URL=http://localhost:4096
OPENCODE_MODEL=auto   # or a specific model name like "anthropic/claude-3-5-sonnet"
```

OpenCode will automatically detect and use locally installed models (Ollama, LM Studio) or
route to cloud providers if API keys are configured in the OpenCode config file (`~/.opencode/config.json`).

---

## 3. Registering Developer Apps

For each platform, you need to register a developer application to get OAuth credentials.

### LinkedIn

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps/new)
2. Create an app and add the **Share on LinkedIn** and **Marketing Developer Platform** products.
3. Add redirect URI: `https://your-domain.example.com/api/auth/callback/linkedin`
4. Copy **Client ID** and **Client Secret** to `.env.local`:
   ```env
   LINKEDIN_CLIENT_ID=...
   LINKEDIN_CLIENT_SECRET=...
   ```

### Twitter / X

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/projects-and-apps)
2. Create an app → enable **OAuth 2.0** with **PKCE**.
3. Add redirect URI: `https://your-domain.example.com/api/auth/callback/twitter`
4. Set **App permissions** to *Read and Write*.
5. Copy credentials to `.env.local`:
   ```env
   TWITTER_CLIENT_ID=...
   TWITTER_CLIENT_SECRET=...
   ```

### TikTok

1. Go to [TikTok Developer Portal](https://developers.tiktok.com/)
2. Create an app → enable **Content Posting API** and **Video Upload API**.
3. Add redirect URI: `https://your-domain.example.com/api/auth/callback/tiktok`
4. Copy credentials to `.env.local`:
   ```env
   TIKTOK_CLIENT_KEY=...
   TIKTOK_CLIENT_SECRET=...
   ```

### Instagram / Meta

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Create an app → add **Instagram Graph API** product.
3. Add your Instagram Business Account ID (found in Meta Business Suite → Settings → Accounts).
4. Add redirect URI: `https://your-domain.example.com/api/auth/callback/instagram`
5. Copy credentials to `.env.local`:
   ```env
   META_APP_ID=...
   META_APP_SECRET=...
   INSTAGRAM_BUSINESS_ACCOUNT_ID=...
   ```

### YouTube

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Create/select project.
2. Enable the **YouTube Data API v3** and **YouTube Analytics API**.
3. Create **OAuth 2.0 Client ID** (Web application).
4. Add redirect URI: `https://your-domain.example.com/api/auth/callback/youtube`
5. Copy credentials to `.env.local`:
   ```env
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

### Facebook

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Create an app → add **Facebook Login** and **Pages API** products.
3. Add redirect URI: `https://your-domain.example.com/api/auth/callback/facebook`
4. Add your Facebook Page ID (found in your Page → About → Page transparency).
5. Copy credentials to `.env.local`:
   ```env
   META_APP_ID=...
   META_APP_SECRET=...
   FACEBOOK_PAGE_ID=...
   ```

### Pinterest

1. Go to [Pinterest Developer Portal](https://developers.pinterest.com/apps/)
2. Create an app → request access to **Pins** and **Boards** scopes.
3. Add redirect URI: `https://your-domain.example.com/api/auth/callback/pinterest`
4. Copy credentials to `.env.local`:
   ```env
   PINTEREST_APP_ID=...
   PINTEREST_APP_SECRET=...
   ```

---

## 4. Celery Worker & Beat Scheduler

The Celery layer handles scheduled campaign sends, analytics syncing, and AI copy generation.

### Prerequisites

- Redis running (see Docker Compose section)
- Python 3.11+
- Dependencies installed: `pip install -r requirements.txt`

### Starting the worker

```bash
# Start the task worker (handles send_campaign, sync_analytics, generate_ai_copy)
celery -A celery_worker worker --loglevel=info
```

### Starting the beat scheduler

```bash
# Start the periodic task scheduler (runs check_scheduled_campaigns every 5 min,
# sync_analytics every 60 min)
celery -A celery_worker beat --loglevel=info
```

### Running both in the background

```bash
celery -A celery_worker worker --loglevel=info --detach
celery -A celery_worker beat --loglevel=info --detach
```

### Available tasks

| Task | Schedule | Description |
|------|----------|-------------|
| `check_scheduled_campaigns` | Every 5 min | Enqueues due campaigns for sending |
| `sync_analytics` | Every 60 min | Pulls metrics from connected platforms |
| `send_campaign(name)` | On demand | Sends a specific campaign to its platform |
| `generate_ai_copy(name, segment, strategy)` | On demand | Generates copy via OpenCode LLM |

---

## 5. Docker Compose Quickstart

The included `docker-compose.yml` spins up Redis, the Celery worker, the beat scheduler, and the dashboard.

### Setup

1. Copy the environment file:

   ```bash
   cp social_ops_studio/.env.example .env
   # Fill in your credentials
   nano .env
   ```

2. Build and start all services:

   ```bash
   docker compose up --build -d
   ```

3. Check service logs:

   ```bash
   docker compose logs -f worker
   docker compose logs -f beat
   ```

4. Run the dashboard interactively:

   ```bash
   docker compose run --rm dashboard python marketing_tool.py
   ```

### Service overview

| Service | Description |
|---------|-------------|
| `redis` | Redis 7 — broker and result backend for Celery |
| `worker` | Celery worker — processes campaign sends and analytics syncs |
| `beat` | Celery beat — fires periodic tasks on schedule |
| `dashboard` | Python marketing tool — interactive CLI dashboard |

### Stopping

```bash
docker compose down
```

### Stopping and removing data

```bash
docker compose down -v
```
