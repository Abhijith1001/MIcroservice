# 🚀 AWS EC2 Deployment Commands Guide
## Where to Run Each Command - Local vs EC2

**Last Updated:** 2025-11-21  
**Your Setup:** Microservices + Automatic Subdomains on AWS EC2

---

## 📍 Command Execution Map

| Task | Location | Access Method |
|------|----------|---------------|
| DNS Configuration | Cloudflare Dashboard | Browser |
| Server Setup (Nginx, SSL, PM2) | **AWS EC2 Instance** | SSH |
| Code Upload | Local Machine → EC2 | Git or SCP |
| Testing APIs | Anywhere | Browser/Curl/Postman |
| Local Development | Your Local Machine | Terminal |

---

## 🔑 STEP 1: Connect to Your AWS EC2 Instance

### **From Your Local Windows Machine:**

```powershell
# Open PowerShell or Windows Terminal

# Navigate to where your .pem key file is stored
cd C:\Users\abhij\Downloads  # Or wherever you saved your AWS key

# Connect to EC2 (replace with your details)
ssh -i "your-key-name.pem" ubuntu@ec2-XX-XXX-XX-XXX.compute.amazonaws.com

# Example:
ssh -i "leopardstore-key.pem" ubuntu@ec2-3-110-123-45.ap-south-1.compute.amazonaws.com
```

**If you get "Permissions are too open" error on Windows:**

```powershell
# Fix permissions on .pem file
icacls "your-key-name.pem" /inheritance:r
icacls "your-key-name.pem" /grant:r "%USERNAME%:R"
```

### **Once Connected, You'll See:**

```bash
ubuntu@ip-172-31-XX-XX:~$
```

✅ **Now you're inside your EC2 instance!** All server commands below run here.

---

## 🌐 STEP 2: DNS Setup (Browser - Cloudflare)

**Location:** 🌍 **Cloudflare Dashboard** (do this in your browser)

1. Go to: https://dash.cloudflare.com
2. Login and select your domain
3. Go to **DNS** → **Records**
4. Add these records:

| Type | Name | Content | Proxy Status |
|------|------|---------|--------------|
| A | @ | `YOUR_EC2_PUBLIC_IP` | Proxied ☁️ |
| A | * | `YOUR_EC2_PUBLIC_IP` | Proxied ☁️ |

**Get your EC2 Public IP:**

```bash
# Run this ON EC2 (after SSH)
curl ifconfig.me
# Or check AWS Console → EC2 → Instances → Your Instance → Public IPv4
```

---

## 🖥️ STEP 3: EC2 Server Setup Commands

### **⚠️ ALL COMMANDS BELOW RUN ON EC2 (AFTER SSH)**

Connect to EC2 first, then run these:

### **3.1: Update System**

```bash
# ✅ Run on EC2
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### **3.2: Install Node.js**

```bash
# ✅ Run on EC2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v18.x
npm --version   # Should show v9.x
```

### **3.3: Install Nginx**

```bash
# ✅ Run on EC2
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

**Test:** Open browser → `http://YOUR_EC2_PUBLIC_IP` → Should see "Welcome to nginx!"

### **3.4: Configure Firewall (Security Groups)**

**Location:** 🌍 **AWS Console** (do this in your browser)

1. Go to **EC2 Dashboard** → **Security Groups**
2. Select your instance's security group
3. Edit **Inbound Rules** → Add these:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| HTTP | TCP | 80 | 0.0.0.0/0 | Allow HTTP |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Allow HTTPS |
| SSH | TCP | 22 | Your IP | Allow SSH |
| Custom TCP | TCP | 7000 | 0.0.0.0/0 | API Gateway (optional) |

---

## 📦 STEP 4: Get Your Code on EC2

### **Option A: Using Git (Recommended)**

```bash
# ✅ Run on EC2
cd ~
git clone https://github.com/Abhijith1001/MIcroservice.git
cd MIcroservice

# If private repo, setup GitHub SSH key or use HTTPS with token
```

### **Option B: Upload from Local Machine**

**📌 Run on YOUR LOCAL MACHINE (Windows PowerShell):**

```powershell
# Navigate to your project folder
cd "C:\Users\abhij\Documents\Leopard\MIcroservice with Kafka"

# Upload to EC2 using SCP
scp -i "your-key.pem" -r . ubuntu@ec2-XX-XXX-XX-XXX.compute.amazonaws.com:~/microservice/

# Example:
scp -i "leopardstore-key.pem" -r "Service" ubuntu@ec2-3-110-123-45.ap-south-1.compute.amazonaws.com:~/microservice/
```

---

## 🔧 STEP 5: Install Project Dependencies

```bash
# ✅ Run on EC2
cd ~/microservice  # or wherever you cloned/uploaded

# Install dependencies for all services
cd Service/tenant-service && npm install && cd ../..
cd Service/api-gateway && npm install && cd ../..
cd Service/product-service && npm install && cd ../..
```

---

## 🔐 STEP 6: Setup Environment Variables

```bash
# ✅ Run on EC2

# Create .env for tenant-service
nano ~/microservice/Service/tenant-service/.env
```

**Paste this content (update with your values):**

```env
TENANT_REGISTRY_URI=mongodb+srv://abhijiithb_db_user:SdyNpzWgsqjVnWYK@saasample.9wzsdy0.mongodb.net/tenant_registry?retryWrites=true&w=majority

MONGO_BASE_URI=mongodb+srv://abhijiithb_db_user:SdyNpzWgsqjVnWYK@saasample.9wzsdy0.mongodb.net

MAIN_DOMAIN=leopardstore.com

PORT=4100
```

Press: `Ctrl + O` (save) → `Enter` → `Ctrl + X` (exit)

**Repeat for API Gateway:**

```bash
# ✅ Run on EC2
nano ~/microservice/Service/api-gateway/.env
```

```env
TENANT_SERVICE_BASE=http://localhost:4100/api
PRODUCT_SERVICE_BASE=http://localhost:4300/api
PAYMENT_SERVICE_BASE=http://localhost:8000/payment-service

GATEWAY_ALLOWED_ORIGINS=http://localhost:5173,https://leopardstore.com,https://*.leopardstore.com,*

PORT=7000
```

---

## 🌐 STEP 7: Configure Nginx

```bash
# ✅ Run on EC2
sudo nano /etc/nginx/sites-available/leopardstore.conf
```

**Paste this configuration:**

```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name .leopardstore.com leopardstore.com;
    return 301 https://$host$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name .leopardstore.com leopardstore.com;

    # SSL Configuration (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/leopardstore.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leopardstore.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/leopardstore_access.log;
    error_log /var/log/nginx/leopardstore_error.log;

    # Proxy to API Gateway
    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Activate and test:**

```bash
# ✅ Run on EC2
sudo ln -s /etc/nginx/sites-available/leopardstore.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Remove default config
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## 🔒 STEP 8: Get SSL Certificate

### **8.1: Install Certbot**

```bash
# ✅ Run on EC2
sudo apt install -y certbot python3-certbot-dns-cloudflare
```

### **8.2: Get Cloudflare API Token**

**Location:** 🌍 **Cloudflare Dashboard** (do this in your browser)

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use template: **Edit zone DNS**
4. Permissions: Zone → DNS → Edit, Zone → Zone → Read
5. Zone Resources: Include → Specific zone → `leopardstore.com`
6. Click **Continue to summary** → **Create Token**
7. **Copy the token** (save it somewhere safe!)

### **8.3: Create Credentials File**

```bash
# ✅ Run on EC2
sudo mkdir -p /root/.secrets/certbot
sudo chmod 700 /root/.secrets/certbot
sudo nano /root/.secrets/certbot/cloudflare.ini
```

**Paste (replace with YOUR token):**

```ini
dns_cloudflare_api_token = your_cloudflare_token_here_1234567890abcdef
```

**Secure it:**

```bash
# ✅ Run on EC2
sudo chmod 600 /root/.secrets/certbot/cloudflare.ini
```

### **8.4: Get Certificate**

```bash
# ✅ Run on EC2
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
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/leopardstore.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/leopardstore.com/privkey.pem
```

### **8.5: Reload Nginx**

```bash
# ✅ Run on EC2
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚀 STEP 9: Start Services with PM2

### **9.1: Install PM2**

```bash
# ✅ Run on EC2
sudo npm install -g pm2
```

### **9.2: Create Ecosystem File**

```bash
# ✅ Run on EC2
cd ~/microservice
nano ecosystem.config.js
```

**Paste this:**

```javascript
module.exports = {
  apps: [
    {
      name: 'tenant-service',
      script: './Service/tenant-service/src/index.js',
      cwd: '/home/ubuntu/microservice',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 4100
      }
    },
    {
      name: 'api-gateway',
      script: './Service/api-gateway/index.js',
      cwd: '/home/ubuntu/microservice',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 7000
      }
    },
    {
      name: 'product-service',
      script: './Service/product-service/src/index.js',
      cwd: '/home/ubuntu/microservice',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 4300
      }
    }
  ]
};
```

### **9.3: Start All Services**

```bash
# ✅ Run on EC2
cd ~/microservice
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Setup auto-start on server reboot
pm2 startup
# Copy and run the command it shows

pm2 save
```

---

## 🧪 STEP 10: Test Everything

### **Test from EC2 (while SSH'd in):**

```bash
# ✅ Run on EC2

# Test services locally
curl http://localhost:4100/health  # Tenant service
curl http://localhost:7000/health  # API Gateway

# Test through Nginx (replace with your domain)
curl https://leopardstore.com/health
```

### **Test from Your Local Machine:**

**📌 Run on YOUR LOCAL MACHINE (Windows PowerShell or browser):**

```powershell
# Test DNS resolution
ping leopardstore.com
ping test.leopardstore.com

# Test API
curl https://leopardstore.com/tenant/tenants/register `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"name":"Test Store","subdomain":"teststore"}'

# Or open browser
Start-Process "https://leopardstore.com"
```

### **Create a Test Tenant:**

**Open browser or Postman:**

```
POST https://leopardstore.com/tenant/tenants/register

Headers:
  Content-Type: application/json

Body:
{
  "name": "My First Store",
  "subdomain": "store1"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Store created successfully",
  "tenant": {
    "tenantId": "tenant_1732188166457",
    "name": "My First Store",
    "subdomain": "store1",
    "fullDomain": "store1.leopardstore.com",
    "status": "ACTIVE"
  },
  "accessUrl": "https://store1.leopardstore.com"
}
```

**Test the subdomain:**

```
https://store1.leopardstore.com
```

---

## 📊 STEP 11: Monitoring & Maintenance

### **View Logs (Run on EC2):**

```bash
# ✅ Run on EC2

# PM2 logs
pm2 logs tenant-service
pm2 logs api-gateway
pm2 logs --lines 100  # Last 100 lines

# Nginx logs
sudo tail -f /var/log/nginx/leopardstore_access.log
sudo tail -f /var/log/nginx/leopardstore_error.log

# System resources
htop  # Install with: sudo apt install htop
```

### **Restart Services:**

```bash
# ✅ Run on EC2
pm2 restart tenant-service
pm2 restart all
pm2 reload all  # Zero-downtime restart
```

### **Update Code:**

```bash
# ✅ Run on EC2
cd ~/microservice
git pull origin main
npm install  # If dependencies changed
pm2 reload all
```

---

## 🔧 Troubleshooting Commands

### **DNS Issues:**

```bash
# 📌 Run on LOCAL MACHINE
nslookup leopardstore.com
nslookup test.leopardstore.com 8.8.8.8  # Google DNS

# Or
dig leopardstore.com
dig test.leopardstore.com
```

### **SSL Issues:**

```bash
# ✅ Run on EC2
sudo certbot certificates  # Check certificate status
sudo certbot renew --dry-run  # Test renewal
sudo systemctl reload nginx  # After cert renewal
```

### **Service Issues:**

```bash
# ✅ Run on EC2
pm2 status  # Check if running
pm2 logs --err  # Error logs only
pm2 restart all  # Restart everything

# Check ports
sudo netstat -tulpn | grep LISTEN
sudo lsof -i :4100  # Check who's using port 4100
sudo lsof -i :7000  # Check who's using port 7000
```

### **Nginx Issues:**

```bash
# ✅ Run on EC2
sudo nginx -t  # Test config
sudo systemctl status nginx
sudo systemctl restart nginx

# Check error logs
sudo tail -50 /var/log/nginx/leopardstore_error.log
```

### **Database Connection Issues:**

```bash
# ✅ Run on EC2
# Test MongoDB connection
node -e "const mongoose = require('mongoose'); mongoose.connect('YOUR_MONGODB_URI').then(() => console.log('Connected!')).catch(err => console.error(err));"
```

**Also check:**
- MongoDB Atlas → Network Access → Add EC2 public IP to whitelist
- MongoDB Atlas → Database Access → Verify user credentials

---

## 📋 Quick Reference Cheat Sheet

### **Common Commands by Location**

| Task | Command | Where to Run |
|------|---------|--------------|
| Connect to EC2 | `ssh -i key.pem ubuntu@....` | 💻 Local |
| Update Ubuntu | `sudo apt update && sudo apt upgrade -y` | 🖥️ EC2 |
| View PM2 status | `pm2 status` | 🖥️ EC2 |
| View logs | `pm2 logs` | 🖥️ EC2 |
| Restart service | `pm2 restart tenant-service` | 🖥️ EC2 |
| Test Nginx config | `sudo nginx -t` | 🖥️ EC2 |
| Reload Nginx | `sudo systemctl reload nginx` | 🖥️ EC2 |
| Renew SSL | `sudo certbot renew` | 🖥️ EC2 |
| Upload files | `scp -i key.pem ...` | 💻 Local |
| Test API | `curl https://...` | 💻 Local or 🖥️ EC2 |
| DNS config | Cloudflare Dashboard | 🌍 Browser |

---

## 🎯 Complete Setup Workflow

### **One-Time Initial Setup:**

1. **🌍 Browser:** Configure Cloudflare DNS wildcard
2. **🌍 Browser:** Create Cloudflare API token
3. **🌍 Browser:** Configure AWS Security Group (allow 80, 443, 22)
4. **💻 Local:** Connect to EC2 via SSH
5. **🖥️ EC2:** Update system and install Node.js
6. **🖥️ EC2:** Install Nginx
7. **🖥️ EC2:** Upload/clone your code
8. **🖥️ EC2:** Install npm dependencies
9. **🖥️ EC2:** Configure environment variables
10. **🖥️ EC2:** Setup Nginx configuration
11. **🖥️ EC2:** Get SSL certificate with Certbot
12. **🖥️ EC2:** Install and configure PM2
13. **🖥️ EC2:** Start all services
14. **💻 Local:** Test with browser/Postman

### **Daily Development:**

```bash
# 💻 Local: Make changes to code
git add .
git commit -m "Update"
git push origin main

# 🖥️ EC2: Pull and restart
ssh -i key.pem ubuntu@...
cd ~/microservice
git pull
pm2 reload all
```

---

## ✅ Final Checklist

Before considering deployment complete:

- [ ] Can SSH into EC2 from local machine
- [ ] DNS wildcard resolves to EC2 IP
- [ ] Nginx installed and running
- [ ] SSL certificate obtained and working
- [ ] All services running in PM2
- [ ] Can create tenant via API
- [ ] Subdomain loads successfully (e.g., store1.leopardstore.com)
- [ ] PM2 auto-start configured (`pm2 startup`)
- [ ] MongoDB Atlas IP whitelist includes EC2 IP
- [ ] Security groups allow ports 80, 443, 22

---

## 🆘 Need Help?

**Check logs:**
```bash
# On EC2
pm2 logs
sudo tail -f /var/log/nginx/error.log
```

**Common Issues:**
1. **"Connection refused"** → Service not running (check `pm2 status`)
2. **"502 Bad Gateway"** → Service crashed (check `pm2 logs`)
3. **SSL not working** → Certificate not installed (run `sudo certbot certificates`)
4. **Subdomain not resolving** → DNS not propagated (wait 5-10 mins, check `dig`)

---

**Created by:** Abhijith  
**Last Updated:** 2025-11-21  

🎉 **You're all set!** Now you know exactly where to run each command!
