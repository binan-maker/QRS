# QR Guard Admin Dashboard - Complete Setup Guide

## 🎯 What You Get

A **separate web dashboard** (NOT part of your main app) that shows:

### Real-time Metrics
- ✅ Total Users
- ✅ Daily Active Users (DAU)
- ✅ Monthly Active Users (MAU)
- ✅ Real Active Users (highly engaged)
- ✅ Engagement & Retention Rates

### QR Code Analytics
- ✅ Total QR Codes Generated
- ✅ Unique QR Codes Scanned
- ✅ Total Scans (all time)
- ✅ Scan Rate Percentage

### Content Metrics
- ✅ Total Comments
- ✅ Total Reports (moderation queue)

### Cost Analysis
- ✅ **Estimated Monthly Firebase Cost**
- ✅ Cost Breakdown (Reads, Writes, Storage, Bandwidth, Auth)
- ✅ Detailed Cost Table with Percentages
- ✅ Free Tier Utilization Tracker

### Visualizations
- ✅ 30-Day User Activity Trends (Line Chart)
- ✅ Cost Breakdown Pie Chart
- ✅ Budget Monitoring Alerts
- ✅ Optimization Recommendations

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
cd /workspace/admin-dashboard
npm install
```

### Step 2: Configure Firebase
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase credentials from your existing QR Guard project:
- Go to Firebase Console → Project Settings → General
- Scroll to "Your apps" → Web App
- Copy the config values

### Step 3: Run Dashboard
```bash
npm run dev
```

Open browser: `http://localhost:3000`

---

## 📊 Dashboard Features Explained

### 1. Key Metrics Cards (Top Row)
Shows user engagement at a glance:
- **Total Users**: All registered users
- **Daily Active Users**: Logged in last 24 hours
- **Monthly Active Users**: Logged in last 30 days
- **Real Active Users**: Highly engaged (7-day activity, multiple sessions)

**Engagement Rate** = DAU / Total Users × 100%  
**Retention Rate** = Real Active / MAU × 100%

### 2. QR Analytics Cards (Second Row)
Track QR code performance:
- **Total QR Codes**: All generated codes
- **Unique QRs Scanned**: Distinct codes scanned at least once
- **Total Scans**: Lifetime scan count
- **Scan Rate**: % of QRs that have been scanned

### 3. Content & Reports (Third Row)
Monitor community health:
- **Total Comments**: All user comments
- **Total Reports**: Pending moderation items
- **Estimated Monthly Cost**: Real-time cost projection

### 4. Charts Section
**User Activity Trends** (Line Chart):
- Shows DAU and scans over last 30 days
- Identify growth patterns and usage spikes

**Cost Breakdown** (Pie Chart):
- Visual distribution of costs by service
- Quickly identify cost drivers

### 5. Detailed Cost Table
Itemized monthly costs:
| Service | Cost | % of Total |
|---------|------|------------|
| Firestore Reads | $X.XX | XX% |
| Firestore Writes | $X.XX | XX% |
| Storage | $X.XX | XX% |
| Bandwidth | $X.XX | XX% |
| Authentication | $X.XX | XX% |
| **Total** | **$X.XX** | **100%** |

### 6. Budget Monitoring Panel
Automated recommendations:
- ✅ Cost optimization status
- ℹ️ Free tier utilization percentage
- ⚠️ Weekly review reminders

---

## 💰 Dashboard Operating Costs

The dashboard itself is **extremely cheap** to run:

| User Scale | Dashboard Cost/Month |
|------------|---------------------|
| < 1K users | FREE (free tier) |
| 10K users | ~$0.10 |
| 100K users | ~$1.00 |
| 1M users | ~$10.00 |

**Why so cheap?**
- Uses efficient `getCountFromServer()` queries
- Minimal data fetching (counts only, not full documents)
- Client-side caching prevents redundant reads
- No writes (read-only dashboard)

---

## 🔒 Security Setup (IMPORTANT!)

The dashboard currently has **no authentication**. Before deploying:

### Option 1: Firebase Auth + Middleware
1. Enable Email/Password auth in Firebase Console
2. Create admin user account
3. Add middleware for route protection

Create `middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
```

### Option 2: Vercel/Netlify Password Protection
- Deploy to Vercel Pro ($20/month)
- Enable password protection in deployment settings

### Option 3: IP Whitelist (Firebase Rules)
Update Firestore rules to only allow reads from your IP:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if request.auth != null && request.auth.token.email == 'admin@qrguard.com';
      allow write: if false; // Read-only dashboard
    }
  }
}
```

---

## 📈 Usage Guidelines

### Weekly Review Checklist (Every Monday)
1. ✅ Check engagement rate (should be > 20%)
2. ✅ Review retention rate (should be > 50%)
3. ✅ Monitor cost trends (look for spikes)
4. ✅ Clear report queue (address pending reports)
5. ✅ Verify free tier usage (< 80%)

### Monthly Deep Dive
1. Analyze cost per user trends
2. Compare DAU/MAU ratio month-over-month
3. Review QR scan rates
4. Identify underperforming features
5. Plan optimizations for next month

### Quarterly Strategy
1. Forecast costs for next quarter
2. Evaluate need for infrastructure upgrades
3. Review user feedback and feature requests
4. Plan marketing initiatives based on growth trends

---

## 🛠️ Deployment Options

### Option 1: Vercel (Recommended - Easiest)
```bash
npm install -g vercel
vercel login
vercel
```
- Free tier available
- Automatic HTTPS
- Global CDN
- Easy environment variable management

### Option 2: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select existing project
firebase deploy
```
- Free tier: 10GB storage, 360MB/day bandwidth
- Integrated with your existing Firebase project

### Option 3: Netlify
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```
- Free tier available
- Simple drag-and-drop deployment

---

## 🔧 Customization

### Add More Metrics
Edit `lib/admin-service.ts`:
```typescript
export async function getNewFeatureUsage(): Promise<number> {
  const ref = collection(db, 'newFeature');
  const snapshot = await getCountFromServer(ref);
  return snapshot.data().count;
}
```

Then add to dashboard component.

### Change Refresh Rate
In `components/Dashboard.tsx`, modify the `useEffect`:
```typescript
useEffect(() => {
  loadStats();
  const interval = setInterval(loadStats, 300000); // Refresh every 5 minutes
  return () => clearInterval(interval);
}, []);
```

### Add Export Functionality
Add CSV export button:
```typescript
const exportToCSV = () => {
  const csv = convertStatsToCSV(stats);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qr-guard-stats-${new Date().toISOString()}.csv`;
  a.click();
};
```

---

## 🐛 Troubleshooting

### "Failed to load dashboard data"
**Cause**: Firebase configuration issue  
**Fix**: 
1. Verify `.env.local` has correct values
2. Check Firestore security rules allow reads
3. Test connection: `console.log(db)` in browser

### High Dashboard Costs
**Cause**: Too frequent refreshes or unoptimized queries  
**Fix**:
1. Increase refresh interval (> 5 minutes)
2. Use `getCountFromServer()` instead of fetching all docs
3. Implement query limits

### Authentication Errors
**Cause**: Firebase Auth not configured  
**Fix**:
1. Enable Email/Password in Firebase Console → Authentication
2. Create admin user manually
3. Update security rules

---

## 📱 Mobile Responsive

The dashboard is fully responsive:
- **Desktop**: Full 4-column grid with all charts
- **Tablet**: 2-column grid, stacked charts
- **Mobile**: Single column, vertical layout

Test on different devices before deploying.

---

## 🎉 Success Metrics

You'll know the dashboard is working when you see:
- ✅ Real numbers (not zeros) for all metrics
- ✅ Charts rendering with data
- ✅ Cost estimates matching Firebase Console
- ✅ Fast load times (< 3 seconds)
- ✅ No console errors

---

## 📞 Support

If you need help:
1. Check this guide first
2. Review Firebase Console logs
3. Test with small dataset
4. Contact development team

---

**Dashboard created successfully! 🚀**

Next steps:
1. Run `npm install` in `/workspace/admin-dashboard`
2. Configure `.env.local` with Firebase credentials
3. Run `npm run dev` and open `http://localhost:3000`
4. Set up authentication before deploying to production
5. Schedule weekly reviews in your calendar

**Estimated setup time: 5-10 minutes**  
**Operating cost: <$1/month for most deployments**
