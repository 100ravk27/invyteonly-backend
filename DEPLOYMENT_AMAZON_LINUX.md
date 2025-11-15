# AWS EC2 Deployment Guide for Amazon Linux

This guide is specifically for Amazon Linux 2023 or Amazon Linux 2.

## Step 1: Connect to EC2 Instance

```bash
ssh -i /path/to/your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

## Step 2: Install Required Software

### Update system packages
```bash
sudo yum update -y
```

### Install Node.js 20.x (Amazon Linux 2023)
```bash
# For Amazon Linux 2023
sudo dnf install -y nodejs npm

# If Node.js 20 is not available, use NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

### For Amazon Linux 2 (older versions)
```bash
# Install Node.js 20.x using NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Or use NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### Verify installation
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Install PM2 globally
```bash
sudo npm install -g pm2
```

### Install Git
```bash
sudo yum install -y git
```

### Install Nginx
```bash
# For Amazon Linux 2023
sudo dnf install -y nginx

# For Amazon Linux 2
sudo yum install -y nginx
```

## Step 3: Clone Your Repository

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/invyteonly-backend.git
cd invyteonly-backend
```

## Step 4: Create Environment File

```bash
nano .env
```

Paste your environment variables (same as before).

## Step 5: Install Dependencies

```bash
npm install --production
```

## Step 6: Test Application

```bash
npm start
```

Press `Ctrl+C` to stop.

## Step 7: Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Follow the instructions shown (usually a sudo command).

## Step 8: Configure Nginx

### For Amazon Linux 2023:
```bash
sudo nano /etc/nginx/conf.d/invyteonly-backend.conf
```

### For Amazon Linux 2:
```bash
sudo nano /etc/nginx/conf.d/invyteonly-backend.conf
```

Paste the Nginx configuration (same as before).

Then:
```bash
# Test Nginx config
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 9: Configure Firewall (if needed)

```bash
# Check if firewalld is running
sudo systemctl status firewalld

# If running, allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 10: Test Deployment

Visit: `http://YOUR_EC2_PUBLIC_IP/`

---

**Note**: Amazon Linux uses `yum` (or `dnf` on AL2023) instead of `apt`, and `ec2-user` instead of `ubuntu`.

