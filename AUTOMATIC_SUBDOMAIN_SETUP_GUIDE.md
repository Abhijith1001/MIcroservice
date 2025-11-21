# 🚀 Automatic Subdomain Setup Guide
## Complete Step-by-Step Implementation for Multi-Tenant SaaS Platform

**Generated:** 2025-11-21  
**Platform:** Ubuntu 22.04 + Node.js + MongoDB + Cloudflare DNS  
**Architecture:** Microservices with API Gateway + Tenant Service

---

## 📋 Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [DNS Configuration](#dns-configuration)
5. [Nginx Reverse Proxy Setup](#nginx-reverse-proxy-setup)
6. [SSL Certificate Configuration](#ssl-certificate-configuration)
7. [Tenant Service Configuration](#tenant-service-configuration)
8. [API Gateway Setup](#api-gateway-setup)
9. [Client Integration](#client-integration)
10. [Testing the Flow](#testing-the-flow)
11. [SEO & Indexing](#seo-indexing)
12. [Monitoring & Troubleshooting](#monitoring-troubleshooting)

---

## 🏗️ System Architecture Overview

Your system creates automatic subdomains using the following flow:

```
User Registration Request
    ↓
Client (Frontend) → API Gateway (Port 7000)
    ↓
Tenant Service (Port 4100)
    ↓
1. Creates tenant record in registry DB
2. Generates unique subdomain (e.g., "store.leopardstore.com")
3. Creates dedicated MongoDB database for tenant
4. Returns tenant info to client
    ↓
DNS (Wildcard *.leopardstore.com) → Nginx (Port 443)
    ↓
Proxies to API Gateway → Routes to appropriate microservice
    ↓
Each request includes tenant context via headers
```

### **Tenant Data Structure**
```javascript
{
  _id: "691fe916cc271382108f5501",
  tenantId: "tenant_1763698966412",           // Unique identifier
  name: "store",                               // Display name
  subdomain: "store",                          // Subdomain prefix
  dbName: "store_tenant_1763698966412",       // Tenant's database name
  dbUri: "mongodb+srv://...",                  // Connection string
  status: "ACTIVE",                            // ACTIVE | SUSPENDED | PENDING
  meta: {
    createdAt: "2025-11-21T04:22:46.457Z",
    updatedAt: "2025-11-21T04:22:46.494Z"
  }
}
```

---

## ✅ Prerequisites

Before starting, ensure you have:

### **Server Requirements**
- [ ] Ubuntu 22.04 LTS (or similar Linux distribution)
- [ ] Minimum 2GB RAM, 2 CPU cores
- [ ] Root or sudo access
- [ ] Public IP address

### **Software Stack**
- [ ] Node.js v18+ (`node --version`)
- [ ] npm v9+ (`npm --version`)
- [ ] MongoDB Atlas account (or local MongoDB)
- [ ] Git installed

### **Domain & DNS**
- [ ] Domain name (e.g., `leopardstore.com`)
- [ ] Access to DNS provider (Cloudflare recommended)
- [ ] Cloudflare API token (for automatic SSL)

### **Services Running**
- [ ] Tenant Service (Port 4100)
- [ ] API Gateway (Port 7000)
- [ ] Product Service (Port 4300)
- [ ] Other microservices as needed

---

## 🔧 Environment Setup

### **STEP 1: Update System & Install Dependencies**

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x or higher
npm --version   # Should show v9.x or higher
```

**Expected Output:**
```
✓ Node.js v18.17.0 installed
✓ npm v9.8.1 installed
```

---

### **STEP 2: Clone & Setup Your Project**

```bash
# Navigate to your projects directory
cd /home/ubuntu  # or wherever you want

# Clone your repository (if not already done)
git clone https://github.com/yourusername/microservice-kafka.git
cd microservice-kafka

# Install dependencies for all services
cd Service/tenant-service && npm install && cd ../..
cd Service/api-gateway && npm install && cd ../..
cd Service/product-service && npm install && cd ../..

# Or use a loop
for service in tenant-service api-gateway product-service; do
  cd Service/$service
  npm install
  cd ../..
done
```

---

### **STEP 3: Configure Environment Variables**

#### **Tenant Service (.env)**

Create/edit `Service/tenant-service/.env`:

```bash
# MongoDB Registry (stores all tenant information)
TENANT_REGISTRY_URI=mongodb+srv://username:password@cluster.mongodb.net/tenant_registry?retryWrites=true&w=majority

# MongoDB Base URI (used for creating individual tenant databases)
MONGO_BASE_URI=mongodb+srv://username:password@cluster.mongodb.net

# Main domain for subdomains
MAIN_DOMAIN=leopardstore.com

# Service Port
PORT=4100
```

#### **API Gateway (.env)**

Create/edit `Service/api-gateway/.env`:

```bash
# Service URLs
TENANT_SERVICE_BASE=http://localhost:4100/api
PRODUCT_SERVICE_BASE=http://localhost:4300/api
PAYMENT_SERVICE_BASE=http://localhost:8000/payment-service

# CORS Configuration
GATEWAY_ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com,*

# Gateway Port
PORT=7000
```

---

## 🌐 DNS Configuration

### **STEP 4: Create Wildcard DNS Record**

**Purpose:** Allow ALL subdomains (e.g., `store1.leopardstore.com`, `store2.leopardstore.com`) to resolve to your server automatically.

#### **For Cloudflare DNS:**

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (`leopardstore.com`)
3. Go to **DNS** → **Records**
4. Click **Add record**

**Add these 2 records:**

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | `@` | `YOUR_SERVER_IP` | Proxied (Orange) | Auto |
| A | `*` | `YOUR_SERVER_IP` | Proxied (Orange) | Auto |

**Example:**
```
Type: A
Name: *
IPv4 address: 3.110.123.45  (your server's public IP)
Proxy status: Proxied ☁️
TTL: Auto
```

#### **Verify DNS Propagation:**

```bash
# Test main domain
ping leopardstore.com

# Test wildcard subdomain
ping test.leopardstore.com
ping random123.leopardstore.com

# Should all resolve to your server IP
```

**Expected Output:**
```bash
PING test.leopardstore.com (3.110.123.45) 56(84) bytes of data.
64 bytes from 3.110.123.45: icmp_seq=1 ttl=54 time=2.45 ms
```

⏱️ **Time:** DNS propagation can take 1-10 minutes

---

## 🔄 Nginx Reverse Proxy Setup

### **STEP 5: Install Nginx**

```bash
# Install Nginx
sudo apt update
sudo apt install -y nginx

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx
```

**Expected Output:**
```
● nginx.service - A high performance web server
   Active: active (running) since Thu 2025-11-21 10:00:00 UTC
```

---

### **STEP 6: Configure Nginx for Subdomain Routing**

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/leopardstore.conf
```

**Paste this configuration:**

```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name .leopardstore.com leopardstore.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

# HTTPS Server for Main Domain and All Subdomains
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name .leopardstore.com leopardstore.com;

    # SSL Configuration (will be configured after certbot)
    ssl_certificate /etc/letsencrypt/live/leopardstore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leopardstore.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/leopardstore_access.log;
    error_log /var/log/nginx/leopardstore_error.log;

    # Client size limit
    client_max_body_size 10M;

    # Proxy to API Gateway
    location / {
        proxy_pass http://127.0.0.1:7000;
        
        # Essential headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

**Activate the configuration:**

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/leopardstore.conf /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

**Expected Output:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## 🔐 SSL Certificate Configuration

### **STEP 7: Get Wildcard SSL Certificate with Certbot**

**Purpose:** Enable HTTPS for the main domain AND all subdomains with a single certificate.

#### **Install Certbot with Cloudflare Plugin:**

```bash
# Install Certbot and Cloudflare DNS plugin
sudo apt install -y certbot python3-certbot-dns-cloudflare

# Verify installation
certbot --version
```

#### **Get Cloudflare API Token:**

1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click on your profile → **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use template: **Edit zone DNS**
5. Permissions:
   - Zone → DNS → Edit
   - Zone → Zone → Read
6. Zone Resources:
   - Include → Specific zone → `leopardstore.com`
7. Click **Continue to summary** → **Create Token**
8. **Copy the token** (you won't see it again!)

#### **Create Cloudflare Credentials File:**

```bash
# Create secure directory
sudo mkdir -p /root/.secrets/certbot
sudo chmod 700 /root/.secrets/certbot

# Create credentials file
sudo nano /root/.secrets/certbot/cloudflare.ini
```

**Add this content (replace with YOUR token):**

```ini
# Cloudflare API token
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN_HERE
```

**Secure the file:**

```bash
sudo chmod 600 /root/.secrets/certbot/cloudflare.ini
```

#### **Request Wildcard Certificate:**

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/certbot/cloudflare.ini \
  -d "leopardstore.com" \
  -d "*.leopardstore.com" \
  --agree-tos \
  --no-eff-email \
  --email admin@leopardstore.com
```

**Expected Output:**
```
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Requesting a certificate for leopardstore.com and *.leopardstore.com
Waiting 10 seconds for DNS changes to propagate

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/leopardstore.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/leopardstore.com/privkey.pem
```

#### **Verify Certificate:**

```bash
# List certificate files
sudo ls -la /etc/letsencrypt/live/leopardstore.com/

# Check certificate validity
sudo certbot certificates
```

#### **Setup Auto-Renewal:**

```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run

# Check renewal timer status
sudo systemctl status certbot.timer

# View scheduled renewal tasks
sudo systemctl list-timers | grep certbot
```

**Expected Output:**
```
certbot.timer loaded active waiting
```

**Reload Nginx to use new certificates:**

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🏢 Tenant Service Configuration

### **STEP 8: Understanding Tenant Creation Flow**

Your tenant service automatically:

1. **Receives registration request** with `name` and `subdomain`
2. **Generates unique tenant ID** (`tenant_<timestamp>`)
3. **Creates tenant record** in registry database
4. **Creates dedicated MongoDB database** for the tenant
5. **Initializes tenant database** with basic schema
6. **Returns tenant information** to client

#### **Current Implementation Review:**

**File:** `Service/tenant-service/src/routes/tenants.js`

```javascript
router.post("/tenants/register", async (req, res) => {
  const { name, subdomain } = req.body;

  // Sanitize subdomain
  const sub = subdomain.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Generate unique identifiers
  const tenantId = "tenant_" + Date.now();
  const dbName = "store_" + tenantId;
  const dbUri = `${process.env.MONGO_BASE_URI}/${dbName}`;

  // Create tenant record
  await Tenant.create({
    tenantId,
    name,
    subdomain: sub,
    dbName,
    dbUri,
    status: "ACTIVE",
    createdAt: new Date(),
  });

  //  Initialize tenant's dedicated database
  const conn = await mongoose.createConnection(dbUri).asPromise();
  const StoreInit = conn.model("Init", StoreInitSchema);
  await StoreInit.create({ initialized: true, createdAt: new Date() });

  res.json({
    message: "Store created successfully",
    tenantId,
    dbUri,
    fullSubdomain: `${sub}.${process.env.MAIN_DOMAIN}`,
  });
});
```

---

### **STEP 9: Enhanced Tenant Service (with improvements)**

Let me provide an improved version with better error handling:

Create: `Service/tenant-service/src/routes/tenants-enhanced.js`

```javascript
import express from "express";
import mongoose from "mongoose";
import Tenant from "../models/Tenant.js";

const router = express.Router();

// Subdomain validation regex
const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// Reserved subdomains (prevent conflicts)
const RESERVED_SUBDOMAINS = [
  'www', 'api', 'admin', 'mail', 'ftp', 'localhost', 
  'staging', 'dev', 'test', 'dashboard', 'app'
];

/**
 * Resolve tenant by hostname
 * GET /resolve?host=store.leopardstore.com
 */
router.get("/resolve", async (req, res) => {
  try {
    const host = (req.query.host || "").toLowerCase();
    const mainDomain = process.env.MAIN_DOMAIN;

    if (!host) {
      return res.status(400).json({ error: "Host parameter required" });
    }

    let tenant;

    // Check if it's a subdomain of main domain
    if (host.endsWith(mainDomain)) {
      const subdomain = host.replace(`.${mainDomain}`, "");
      
      // Skip main domain
      if (subdomain === mainDomain || subdomain === `www.${mainDomain}`) {
        return res.json(null);
      }

      tenant = await Tenant.findOne({ 
        subdomain: subdomain,
        status: 'ACTIVE'
      }).lean();
    } else {
      // Check custom domain
      tenant = await Tenant.findOne({ 
        customDomain: host,
        status: 'ACTIVE'
      }).lean();
    }

    if (!tenant) {
      return res.json(null);
    }

    // Return minimal info (don't expose everything)
    res.json({
      tenantId: tenant.tenantId,
      dbUri: tenant.dbUri,
      name: tenant.name,
      subdomain: tenant.subdomain
    });
  } catch (error) {
    console.error("Tenant resolution error:", error);
    res.status(500).json({ error: "Failed to resolve tenant" });
  }
});

/**
 * Register new tenant (create automatic subdomain)
 * POST /tenants/register
 * Body: { name: "My Store", subdomain: "mystore" }
 */
router.post("/tenants/register", async (req, res) => {
  try {
    const { name, subdomain } = req.body;

    // Validation
    if (!name || !subdomain) {
      return res.status(400).json({ 
        error: "Name and subdomain are required" 
      });
    }

    // Sanitize and validate subdomain
    const sanitized = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    
    if (!SUBDOMAIN_REGEX.test(sanitized)) {
      return res.status(400).json({ 
        error: "Invalid subdomain format. Use only lowercase letters, numbers, and hyphens." 
      });
    }

    if (RESERVED_SUBDOMAINS.includes(sanitized)) {
      return res.status(400).json({ 
        error: "This subdomain is reserved and cannot be used." 
      });
    }

    // Check if subdomain already exists
    const existing = await Tenant.findOne({ subdomain: sanitized });
    if (existing) {
      return res.status(409).json({ 
        error: "Subdomain already taken" 
      });
    }

    // Generate unique identifiers
    const tenantId = `tenant_${Date.now()}`;
    const dbName = `store_${tenantId}`;
    const dbUri = `${process.env.MONGO_BASE_URI}/${dbName}`;

    // Create tenant record
    const tenant = await Tenant.create({
      tenantId,
      name,
      subdomain: sanitized,
      dbName,
      dbUri,
      status: "ACTIVE"
    });

    // Initialize tenant's dedicated database
    let conn;
    try {
      conn = await mongoose.createConnection(dbUri).asPromise();
      
      const StoreInitSchema = new mongoose.Schema({
        initialized: { type: Boolean, default: true },
        tenantId: String,
        createdAt: { type: Date, default: Date.now }
      });

      const StoreInit = conn.model("Init", StoreInitSchema);
      await StoreInit.create({ 
        initialized: true, 
        tenantId,
        createdAt: new Date() 
      });

      console.log(`✓ Tenant database initialized: ${dbName}`);
    } catch (dbError) {
      console.error("Database initialization error:", dbError);
      // Rollback - delete tenant record
      await Tenant.deleteOne({ _id: tenant._id });
      throw new Error("Failed to initialize tenant database");
    } finally {
      if (conn) await conn.close();
    }

    // Success response
    res.status(201).json({
      success: true,
      message: "Store created successfully",
      tenant: {
        tenantId,
        name,
        subdomain: sanitized,
        fullDomain: `${sanitized}.${process.env.MAIN_DOMAIN}`,
        status: "ACTIVE"
      },
      accessUrl: `https://${sanitized}.${process.env.MAIN_DOMAIN}`
    });

  } catch (error) {
    console.error("Tenant registration error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to create tenant" 
    });
  }
});

/**
 * Get all tenants (admin endpoint)
 * GET /tenants
 */
router.get("/tenants", async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const tenants = await Tenant.find(filter)
      .select('-dbUri') // Don't expose DB connection strings
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ 'meta.createdAt': -1 });

    const total = await Tenant.countDocuments(filter);

    res.json({
      tenants,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error("List tenants error:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

/**
 * Check subdomain availability
 * GET /tenants/check-availability?subdomain=mystore
 */
router.get("/tenants/check-availability", async (req, res) => {
  try {
    const { subdomain } = req.query;
    
    if (!subdomain) {
      return res.status(400).json({ error: "Subdomain parameter required" });
    }

    const sanitized = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
    
    // Check format
    if (!SUBDOMAIN_REGEX.test(sanitized)) {
      return res.json({ 
        available: false, 
        reason: "Invalid format" 
      });
    }

    // Check reserved
    if (RESERVED_SUBDOMAINS.includes(sanitized)) {
      return res.json({ 
        available: false, 
        reason: "Reserved subdomain" 
      });
    }

    // Check database
    const existing = await Tenant.findOne({ subdomain: sanitized });
    
    res.json({
      available: !existing,
      subdomain: sanitized,
      fullDomain: `${sanitized}.${process.env.MAIN_DOMAIN}`
    });
  } catch (error) {
    console.error("Availability check error:", error);
    res.status(500).json({ error: "Failed to check availability" });
  }
});

export default router;
```

---

## 🌉 API Gateway Setup

### **STEP 10: Start All Services with PM2**

PM2 is a production process manager for Node.js applications.

#### **Install PM2:**

```bash
sudo npm install -g pm2
```

#### **Create PM2 Ecosystem File:**

Create `ecosystem.config.js` in your project root:

```javascript
module.exports = {
  apps: [
    {
      name: 'tenant-service',
      script: './Service/tenant-service/src/index.js',
      cwd: './Service/tenant-service',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4100
      }
    },
    {
      name: 'api-gateway',
      script: './Service/api-gateway/index.js',
      cwd: './Service/api-gateway',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 7000
      }
    },
    {
      name: 'product-service',
      script: './Service/product-service/src/index.js',
      cwd: './Service/product-service',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 4300
      }
    }
  ]
};
```

#### **Start Services:**

```bash
# Start all services
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Setup startup script (auto-start on server reboot)
pm2 startup
pm2 save
```

**Expected Output:**
```
┌─────┬────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name           │ mode        │ status  │ cpu     │ memory   │
├─────┼────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ tenant-service │ cluster     │ online  │ 0%      │ 45.2mb   │
│ 1   │ tenant-service │ cluster     │ online  │ 0%      │ 43.8mb   │
│ 2   │ api-gateway    │ cluster     │ online  │ 0%      │ 38.5mb   │
│ 3   │ api-gateway    │ cluster     │ online  │ 0%      │ 37.1mb   │
│ 4   │ product-service│ fork        │ online  │ 0%      │ 41.0mb   │
└─────┴────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

---

## 💻 Client Integration

### **STEP 11: Frontend Implementation**

#### **Store Registration Form (React Example):**

```javascript
// components/StoreRegistrationForm.jsx
import { useState } from 'react';
import axios from 'axios';

const API_BASE = 'https://leopardstore.com/tenant'; // Through nginx → gateway

export default function StoreRegistrationForm() {
  const [formData, setFormData] = useState({
    name: '',
    subdomain: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Check subdomain availability in real-time
  const checkAvailability = async (subdomain) => {
    if (!subdomain || subdomain.length < 3) return;
    
    try {
      const { data } = await axios.get(
        `${API_BASE}/tenants/check-availability?subdomain=${subdomain}`
      );
      return data.available;
    } catch (err) {
      console.error('Availability check failed:', err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API_BASE}/tenants/register`, formData);
      
      setResult(data);
      
      // Redirect to new subdomain after 2 seconds
      setTimeout(() => {
        window.location.href = data.accessUrl;
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="store-registration">
      <h2>Create Your Store</h2>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Store Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Awesome Store"
            required
          />
        </div>

        <div>
          <label>Choose Subdomain:</label>
          <div className="subdomain-input">
            <input
              type="text"
              value={formData.subdomain}
              onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
              onBlur={(e) => checkAvailability(e.target.value)}
              placeholder="mystore"
              pattern="[a-z0-9-]+"
              required
            />
            <span>.leopardstore.com</span>
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Store'}
        </button>
      </form>

      {result && (
        <div className="success">
          ✓ Store created! Redirecting to {result.accessUrl}...
        </div>
      )}

      {error && (
        <div className="error">
          ✗ {error}
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Testing the Flow

### **STEP 12: Complete End-to-End Test**

#### **Test 1: DNS Resolution**

```bash
# Test wildcard DNS
ping store1.leopardstore.com
ping store2.leopardstore.com
ping anyname.leopardstore.com

# All should resolve to your server IP
```

#### **Test 2: SSL Certificate**

```bash
# Check SSL certificate
curl -I https://leopardstore.com
curl -I https://test.leopardstore.com

# Or use browser - should show 🔒 padlock
```

#### **Test 3: Services Health Check**

```bash
# Check tenant service directly
curl http://localhost:4100/health

# Check API gateway directly
curl http://localhost:7000/health

# Check through Nginx
curl https://leopardstore.com/health
```

#### **Test 4: Create Test Tenant**

```bash
# Register a new store
curl -X POST https://leopardstore.com/tenant/tenants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Store",
    "subdomain": "teststore"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Store created successfully",
  "tenant": {
    "tenantId": "tenant_1732188166457",
    "name": "Test Store",
    "subdomain": "teststore",
    "fullDomain": "teststore.leopardstore.com",
    "status": "ACTIVE"
  },
  "accessUrl": "https://teststore.leopardstore.com"
}
```

#### **Test 5: Resolve Tenant**

```bash
# Resolve by subdomain
curl "https://leopardstore.com/tenant/resolve?host=teststore.leopardstore.com"
```

**Expected Response:**

```json
{
  "tenantId": "tenant_1732188166457",
  "dbUri": "mongodb+srv://...",
  "name": "Test Store",
  "subdomain": "teststore"
}
```

#### **Test 6: Access Subdomain**

```bash
# Visit in browser
https://teststore.leopardstore.com

# Should load your application with tenant context
```

---

## 🔍 SEO & Indexing

### **STEP 13: SEO Configuration for Each Subdomain**

#### **Dynamic robots.txt per tenant:**

Add to your API Gateway or client routing:

```javascript
// Generate robots.txt dynamically
app.get('/robots.txt', async (req, res) => {
  const host = req.headers.host;
  const subdomain = host.split('.')[0];
  
  const robotsTxt = `
User-agent: *
Allow: /
Sitemap: https://${host}/sitemap.xml

# Crawl-delay for polite bots
Crawl-delay: 10
  `.trim();
  
  res.type('text/plain');
  res.send(robotsTxt);
});
```

#### **Dynamic sitemap.xml:**

```javascript
// Generate sitemap for tenant's products
app.get('/sitemap.xml', async (req, res) => {
  const tenant = req.tenant; // From tenant resolver middleware
  const products = await getProductsForTenant(tenant.tenantId);
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${req.headers.host}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${products.map(product => `
  <url>
    <loc>https://${req.headers.host}/products/${product.slug}</loc>
    <lastmod>${product.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('')}
</urlset>`;
  
  res.type('application/xml');
  res.send(sitemap);
});
```

#### **Meta Tags per Store (SSR Required):**

```html
<!-- In your HTML template -->
<head>
  <title>{store.name} | LeopardStore</title>
  <meta name="description" content="{store.description}" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="{store.name}" />
  <meta property="og:description" content="{store.description}" />
  <meta property="og:image" content="{store.logo}" />
  <meta property="og:url" content="https://{subdomain}.leopardstore.com" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{store.name}" />
  <meta name="twitter:description" content="{store.description}" />
  <meta name="twitter:image" content="{store.logo}" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://{subdomain}.leopardstore.com" />
</head>
```

#### **Submit to Google Search Console:**

1. Visit [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://teststore.leopardstore.com`
3. Verify ownership (DNS TXT record or HTML file)
4. Submit sitemap: `https://teststore.leopardstore.com/sitemap.xml`
5. Request indexing for key pages

---

## 📊 Monitoring & Troubleshooting

### **STEP 14: Setup Monitoring**

#### **View Service Logs:**

```bash
# PM2 logs
pm2 logs tenant-service
pm2 logs api-gateway

# Nginx logs
sudo tail -f /var/log/nginx/leopardstore_access.log
sudo tail -f /var/log/nginx/leopardstore_error.log

# Filter for specific subdomain
sudo grep "teststore.leopardstore.com" /var/log/nginx/leopardstore_access.log
```

#### **Monitor Service Health:**

```bash
# Check all PM2 processes
pm2 monit

# Check system resources
htop

# Check port usage
sudo netstat -tulpn | grep LISTEN
```

---

### **Common Issues & Solutions**

#### **Issue 1: Subdomain not resolving**

```bash
# Check DNS propagation
dig teststore.leopardstore.com

# Flush local DNS cache (on client machine)
# Windows
ipconfig /flushdns

# Mac
sudo dscacheutil -flushcache

# Linux
sudo systemd-resolve --flush-caches
```

#### **Issue 2: SSL certificate not working**

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal

# Reload Nginx
sudo systemctl reload nginx
```

#### **Issue 3: Service not responding**

```bash
# Restart specific service
pm2 restart tenant-service

# Restart all services
pm2 restart all

# Check if port is in use
sudo lsof -i :4100
sudo lsof -i :7000
```

#### **Issue 4: Database connection failed**

```bash
# Check MongoDB Atlas IP whitelist
# Add your server's public IP to MongoDB Atlas

# Test connection
mongosh "mongodb+srv://username:password@cluster.mongodb.net/test"
```

#### **Issue 5: CORS errors**

Check your API Gateway CORS configuration and ensure the subdomain is allowed:

```javascript
// Add wildcard pattern for all subdomains
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://leopardstore.com',
  /^https:\/\/[\w-]+\.leopardstore\.com$/  // Regex for subdomains
];
```

---

## ✅ Final Checklist

Before going live, verify:

### **Infrastructure**
- [ ] Server is accessible via public IP
- [ ] Firewall rules allow ports 80, 443, 22
- [ ] DNS wildcard record points to server
- [ ] Nginx installed and running
- [ ] SSL certificate valid for `*.leopardstore.com`
- [ ] Auto-renewal configured for SSL

### **Services**
- [ ] All microservices running (check `pm2 status`)
- [ ] Tenant Service responding on port 4100
- [ ] API Gateway responding on port 7000
- [ ] PM2 startup script configured
- [ ] Environment variables properly set

### **Database**
- [ ] MongoDB Atlas cluster active
- [ ] Server IP whitelisted in Atlas
- [ ] Tenant registry database accessible
- [ ] Database indexes created on `subdomain` field

### **Testing**
- [ ] Can create new tenant via API
- [ ] Subdomain resolves correctly
- [ ] SSL certificate shows in browser
- [ ] Tenant resolution works
- [ ] CORS working for all origins
- [ ] robots.txt accessible
- [ ] sitemap.xml generated

### **SEO**
- [ ] Dynamic meta tags rendering
- [ ] Robots.txt per subdomain
- [ ] Sitemap.xml per subdomain
- [ ] Google Search Console verified
- [ ] Unique content per store

---

## 🎯 Quick Reference Commands

```bash
# Start services
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Restart service
pm2 restart tenant-service

# Check Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# View Nginx logs
sudo tail -f /var/log/nginx/leopardstore_error.log

# Renew SSL
sudo certbot renew

# Check DNS
dig @8.8.8.8 teststore.leopardstore.com

# Test endpoint
curl https://leopardstore.com/tenant/tenants/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","subdomain":"test123"}'
```

---

## 📚 Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                             │
└────────────────────┬────────────────────────────────────────┘
                     │ https://store1.leopardstore.com
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare DNS (Wildcard *.leopardstore.com)   │
└────────────────────┬────────────────────────────────────────┘
                     │ Your Server IP
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Nginx Reverse Proxy (Port 443)                             │
│  - SSL Termination                                          │
│  - Routes to API Gateway                                    │
└────────────────────┬────────────────────────────────────────┘
                     │ http://127.0.0.1:7000
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  API Gateway (Port 7000)                                    │
│  - CORS handling                                            │
│  - Request routing                                          │
│  - Service proxy                                            │
└──┬────────────────┬────────────────┬────────────────────────┘
   │                │                │
   ↓                ↓                ↓
┌──────────┐  ┌──────────┐  ┌──────────────┐
│ Tenant   │  │ Product  │  │   Payment    │
│ Service  │  │ Service  │  │   Service    │
│ (4100)   │  │ (4300)   │  │   (8000)     │
└────┬─────┘  └────┬─────┘  └──────────────┘
     │             │
     ↓             ↓
┌─────────────────────────────────────────────┐
│     MongoDB Atlas                           │
│  - Tenant Registry DB                       │
│  - Store 1 DB (tenant_xxx)                  │
│  - Store 2 DB (tenant_yyy)                  │
│  - Store N DB (tenant_zzz)                  │
└─────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

1. **Load Testing:** Use tools like Apache Bench or Artillery to test under load
2. **CDN Integration:** Configure Cloudflare caching for static assets
3. **Redis Caching:** Cache tenant lookups to reduce database queries
4. **Backup Strategy:** Automate database backups
5. **Monitoring:** Setup tools like Grafana, Prometheus, or DataDog
6. **Analytics:** Integrate Google Analytics per subdomain
7. **Custom Domains:** Allow users to map their own domains
8. **Rate Limiting:** Prevent abuse with rate limiting per tenant

---

**Created by:** Abhijith  
**Last Updated:** 2025-11-21  
**Version:** 2.0

**Questions or Issues?** Check the troubleshooting section or review logs with `pm2 logs` and `sudo tail -f /var/log/nginx/error.log`

---

🎉 **Congratulations!** You now have a fully functioning multi-tenant SaaS platform with automatic subdomain provisioning!
