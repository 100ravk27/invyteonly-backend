# AWS EC2 Deployment Guide for InvyteOnly Backend

This guide will walk you through deploying the InvyteOnly backend on an AWS EC2 instance.

## Prerequisites

- AWS Account
- GitHub repository with your code
- Basic knowledge of Linux commands

## Step 1: Launch EC2 Instance

1. **Go to AWS Console** → EC2 → Launch Instance
2. **Choose Instance Type**: 
   - For development: `t2.micro` (Free tier eligible)
   - For production: `t2.small` or larger
3. **Configure Instance**:
   - Choose Ubuntu Server 22.04 LTS or Amazon Linux 2023
   - Create/select a key pair (`.pem` file) - **SAVE THIS FILE**
4. **Configure Security Group**:
   - Add rule: SSH (port 22) from your IP
   - Add rule: HTTP (port 80) from anywhere (0.0.0.0/0)
   - Add rule: HTTPS (port 443) from anywhere (0.0.0.0/0) - if using SSL
   - Add rule: Custom TCP (port 5000) from anywhere - for direct access (optional)
5. **Launch Instance**

## Step 2: Connect to EC2 Instance

### On Mac/Linux:
```bash
chmod 400 /path/to/your-key.pem
ssh -i /path/to/your-key.pem ubuntu@your-ec2-public-ip
```

### On Windows:
Use PuTTY or WSL with the same command as above.

## Step 3: Initial Server Setup

Once connected, run these commands:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource repository for latest LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node --version
npm --version

# Install PM2 globally (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install MySQL client (optional, for debugging)
sudo apt install -y mysql-client
```

## Step 4: Clone Your Repository

```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/your-username/invyteonly-backend.git

# Navigate to project directory
cd invyteonly-backend
```

## Step 5: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add your environment variables:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=3306
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=invyteonly

# Session Configuration
SESSION_SECRET=your-very-secure-random-secret-key-here

# Gupshup Configuration (if using)
GUPSHUP_API_KEY=your_gupshup_api_key
GUPSHUP_SOURCE=your_gupshup_source
GUPSHUP_DESTINATION=your_gupshup_destination
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 6: Install Dependencies

```bash
# Install project dependencies
npm install --production
```

## Step 7: Test the Application

```bash
# Test if the app starts correctly
npm start
```

Press `Ctrl+C` to stop it. If it starts without errors, proceed to the next step.

## Step 8: Setup PM2 Process Manager

```bash
# Start the application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system reboot
pm2 startup
# Follow the instructions shown (usually involves running a sudo command)
```

Useful PM2 commands:
```bash
pm2 status          # Check application status
pm2 logs            # View logs
pm2 restart invyteonly-backend  # Restart app
pm2 stop invyteonly-backend    # Stop app
pm2 delete invyteonly-backend  # Remove app from PM2
```

## Step 9: Configure Nginx as Reverse Proxy

```bash
# Remove default Nginx configuration
sudo rm /etc/nginx/sites-enabled/default

# Create new configuration
sudo nano /etc/nginx/sites-available/invyteonly-backend
```

Paste the following (update `server_name` with your domain or EC2 IP):

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or EC2 public IP

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Save and exit, then:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/invyteonly-backend /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

## Step 10: Configure Security Group (if needed)

If you can't access the application:

1. Go to AWS Console → EC2 → Security Groups
2. Select your instance's security group
3. Edit inbound rules:
   - Ensure HTTP (port 80) is open from `0.0.0.0/0`
   - Ensure HTTPS (port 443) is open if using SSL

## Step 11: Test Deployment

1. **Test via browser**: `http://your-ec2-public-ip/`
2. **Test API endpoint**: `http://your-ec2-public-ip/auth/request-otp`

You should see: `InvyteOnly backend is running 🚀`

## Step 12: Setup SSL with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx and renew certificates
```

## Step 13: Setup Automatic Deployment (Optional)

Make the deployment script executable:

```bash
chmod +x deploy.sh
```

For future deployments, just run:
```bash
./deploy.sh
```

## Troubleshooting

### Application not starting:
```bash
# Check PM2 logs
pm2 logs invyteonly-backend

# Check if port is in use
sudo lsof -i :5000

# Check application status
pm2 status
```

### Nginx errors:
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Database connection issues:
```bash
# Test database connection from EC2
mysql -h your-rds-endpoint -u your_user -p

# Check if RDS security group allows EC2 instance
# Go to RDS → Security Groups → Add EC2 security group
```

### View application logs:
```bash
# PM2 logs
pm2 logs invyteonly-backend

# Or check log files
tail -f logs/combined.log
```

## Useful Commands Summary

```bash
# Application management
pm2 status
pm2 logs invyteonly-backend
pm2 restart invyteonly-backend
pm2 stop invyteonly-backend

# Nginx management
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t

# View logs
pm2 logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Update and redeploy
cd ~/invyteonly-backend
git pull
npm install --production
pm2 restart invyteonly-backend
```

## Security Best Practices

1. **Keep system updated**: `sudo apt update && sudo apt upgrade`
2. **Use strong passwords** for database and session secrets
3. **Enable firewall**: `sudo ufw enable` (after configuring ports)
4. **Use SSL/HTTPS** in production
5. **Regular backups** of your database
6. **Monitor logs** regularly
7. **Keep dependencies updated**: `npm audit` and `npm update`

## Next Steps

- Setup monitoring (CloudWatch, PM2 Plus)
- Configure domain name with Route 53
- Setup CI/CD pipeline
- Configure automated backups
- Setup log aggregation

---

**Need help?** Check the logs first, then review AWS documentation or contact support.

