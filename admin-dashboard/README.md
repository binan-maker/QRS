# QR Guard Admin Dashboard

A comprehensive admin dashboard for monitoring QR Guard app costs, users, and analytics.

## Features

### 📊 Real-time Metrics
- **Total Users** - Complete user base count
- **Daily Active Users (DAU)** - Users active in last 24 hours
- **Monthly Active Users (MAU)** - Users active in last 30 days
- **Real Active Users** - Highly engaged users (7-day activity with multiple sessions)
- **Engagement Rate** - DAU/MAU percentage
- **Retention Rate** - Real active users / MAU percentage

### 🔍 QR Code Analytics
- **Total QR Codes** - All generated QR codes
- **Unique QRs Scanned** - Distinct QR codes that have been scanned
- **Total Scans** - Lifetime scan count
- **Scan Rate** - Percentage of QR codes that have been scanned

### 💬 Content Metrics
- **Total Comments** - All user comments
- **Total Reports** - Content moderation queue size

### 💰 Cost Analysis
- **Estimated Monthly Cost** - Real-time cost projection
- **Cost Breakdown**:
  - Firestore Reads
  - Firestore Writes
  - Storage
  - Bandwidth
  - Authentication
- **Detailed Cost Table** - Itemized costs with percentages
- **Free Tier Utilization** - Current usage vs free tier limits

### 📈 Visualizations
- **User Activity Trends** - 30-day line chart showing DAU and scans
- **Cost Breakdown Pie Chart** - Visual distribution of costs
- **Budget Monitoring** - Alerts and recommendations

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with QR Guard data

### Setup Steps

1. **Navigate to admin dashboard directory**
```bash
cd admin-dashboard
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**
   - Copy `.env.example` to `.env.local`
```bash
cp .env.example .env.local
```

   - Edit `.env.local` with your Firebase credentials:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

4. **Run development server**
```bash
npm run dev
```

5. **Open browser**
   - Navigate to `http://localhost:3000`

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## Security

### Authentication Setup
To secure the admin dashboard:

1. **Enable Firebase Authentication** in your Firebase console
2. **Create admin user** with email/password
3. **Add authentication middleware** (see `middleware.ts` example)
4. **Set up security rules** in Firestore to restrict access

Example middleware (`middleware.ts`):
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

## Cost Optimization

This dashboard is built with cost optimization in mind:

- ✅ **Efficient Queries** - Uses `getCountFromServer()` for counts
- ✅ **Limited Data Fetching** - Pagination on large collections
- ✅ **Client-side Caching** - React state management
- ✅ **Minimal Reads** - Batched data fetching
- ✅ **Free Tier Friendly** - Stays within Firebase free tier for small deployments

**Estimated Dashboard Costs:**
- < 100 users: FREE
- 1K users: ~$0.01/month
- 10K users: ~$0.10/month
- 100K users: ~$1.00/month

## Usage Guidelines

### Weekly Review Process
1. **Check engagement rate** - Should be > 20%
2. **Review retention rate** - Should be > 50%
3. **Monitor cost trends** - Look for unusual spikes
4. **Check report queue** - Address pending reports
5. **Verify free tier usage** - Stay under 80% of limits

### Budget Alerts Setup
Set up alerts at these thresholds:
- **80%** - Warning notification
- **90%** - Team alert
- **95%** - Immediate action required

### Quarterly Optimization Reviews
1. Analyze cost per user trends
2. Identify new optimization opportunities
3. Review feature usage patterns
4. Update forecasting models

## Troubleshooting

### Common Issues

**"Failed to load dashboard data"**
- Check Firebase configuration in `.env.local`
- Verify Firestore security rules allow reads
- Ensure network connectivity

**High dashboard costs**
- Reduce refresh frequency
- Implement data caching
- Use query limits and pagination

**Authentication errors**
- Verify Firebase Auth is enabled
- Check admin user permissions
- Review security rules

## Architecture

```
admin-dashboard/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main dashboard page
│   └── globals.css     # Global styles
├── components/
│   ├── Dashboard.tsx   # Main dashboard component
│   └── ui/
│       └── card.tsx    # Reusable card component
├── lib/
│   ├── firebase.ts     # Firebase initialization
│   └── admin-service.ts # Data fetching functions
├── .env.example        # Environment variables template
├── next.config.js      # Next.js configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Dependencies
```

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend**: Firebase (Firestore, Auth)
- **Hosting**: Vercel / Firebase Hosting / Netlify

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
1. Check documentation above
2. Review Firebase Console logs
3. Contact development team

---

**Built with ❤️ for QR Guard**
Version: 1.0.0
Last Updated: 2024
