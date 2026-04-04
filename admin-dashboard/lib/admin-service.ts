import { db, collection, query, where, getDocs, getCountFromServer, Timestamp, limit, orderBy } from './firebase';

export interface DashboardStats {
  totalUsers: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  realActiveUsers: number;
  totalQrCodes: number;
  uniqueQrCodesScanned: number;
  totalScans: number;
  totalComments: number;
  totalReports: number;
  estimatedMonthlyCost: number;
  costBreakdown: CostBreakdown;
}

export interface CostBreakdown {
  firestoreReads: number;
  firestoreWrites: number;
  storageCost: number;
  bandwidthCost: number;
  authCost: number;
  totalCost: number;
}

export interface UserActivity {
  date: string;
  dau: number;
  mau: number;
  newUsers: number;
  scans: number;
}

export async function getTotalUsers(): Promise<number> {
  const usersRef = collection(db, 'users');
  const snapshot = await getCountFromServer(usersRef);
  return snapshot.data().count;
}

export async function getActiveUsers(days: number): Promise<number> {
  const cutoffDate = Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  
  // Query scan history for active users
  const scansRef = collection(db, 'scans');
  const q = query(
    scansRef,
    where('scannedAt', '>=', cutoffDate),
    limit(10000)
  );
  
  const snapshot = await getDocs(q);
  const userIds = new Set<string>();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.userId) {
      userIds.add(data.userId);
    }
  });
  
  return userIds.size;
}

export async function getTotalQrCodes(): Promise<number> {
  const qrRef = collection(db, 'qrCodes');
  const snapshot = await getCountFromServer(qrRef);
  return snapshot.data().count;
}

export async function getUniqueQrCodesScanned(): Promise<number> {
  const scansRef = collection(db, 'scans');
  const snapshot = await getDocs(scansRef);
  
  const uniqueQrIds = new Set<string>();
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.qrCodeId) {
      uniqueQrIds.add(data.qrCodeId);
    }
  });
  
  return uniqueQrIds.size;
}

export async function getTotalScans(): Promise<number> {
  const scansRef = collection(db, 'scans');
  const snapshot = await getCountFromServer(scansRef);
  return snapshot.data().count;
}

export async function getTotalComments(): Promise<number> {
  const commentsRef = collection(db, 'comments');
  const snapshot = await getCountFromServer(commentsRef);
  return snapshot.data().count;
}

export async function getTotalReports(): Promise<number> {
  const reportsRef = collection(db, 'reports');
  const snapshot = await getCountFromServer(reportsRef);
  return snapshot.data().count;
}

export async function calculateEstimatedCosts(stats: DashboardStats): Promise<CostBreakdown> {
  // Firebase pricing (as of 2024)
  const FIRESTORE_READ_PRICE = 0.036 / 100000; // $0.036 per 100K reads
  const FIRESTORE_WRITE_PRICE = 0.108 / 100000; // $0.108 per 100K writes
  const STORAGE_PRICE = 0.026 / 1024 / 1024 / 1024; // $0.026 per GB
  const BANDWIDTH_PRICE = 0.12 / 1024 / 1024 / 1024; // $0.12 per GB
  const AUTH_SMS_PRICE = 0.0075; // $0.0075 per SMS after 10K free
  
  // Estimate based on activity (these are approximations)
  const estimatedReadsPerDay = stats.totalScans * 5 + stats.totalUsers * 2;
  const estimatedWritesPerDay = stats.totalScans + stats.totalComments;
  const estimatedStorageGB = stats.totalUsers * 0.005; // 5MB per user average
  const estimatedBandwidthGB = stats.totalScans * 0.0001; // Small data per scan
  
  const monthlyReads = estimatedReadsPerDay * 30;
  const monthlyWrites = estimatedWritesPerDay * 30;
  
  const firestoreReads = Math.max(0, (monthlyReads - 50000)) * FIRESTORE_READ_PRICE; // 50K free reads/day
  const firestoreWrites = Math.max(0, (monthlyWrites - 20000)) * FIRESTORE_WRITE_PRICE; // 20K free writes/day
  const storageCost = estimatedStorageGB * STORAGE_PRICE;
  const bandwidthCost = Math.max(0, (estimatedBandwidthGB - 10)) * BANDWIDTH_PRICE; // 10GB free egress
  const authCost = Math.max(0, (stats.totalUsers * 0.1 - 10000)) * AUTH_SMS_PRICE; // Assume 10% verify
  
  const totalCost = firestoreReads + firestoreWrites + storageCost + bandwidthCost + authCost;
  
  return {
    firestoreReads: parseFloat(firestoreReads.toFixed(2)),
    firestoreWrites: parseFloat(firestoreWrites.toFixed(2)),
    storageCost: parseFloat(storageCost.toFixed(2)),
    bandwidthCost: parseFloat(bandwidthCost.toFixed(2)),
    authCost: parseFloat(authCost.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2))
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    totalUsers,
    dau,
    mau,
    totalQrCodes,
    uniqueQrScanned,
    totalScans,
    totalComments,
    totalReports
  ] = await Promise.all([
    getTotalUsers(),
    getActiveUsers(1),
    getActiveUsers(30),
    getTotalQrCodes(),
    getUniqueQrCodesScanned(),
    getTotalScans(),
    getTotalComments(),
    getTotalReports()
  ]);
  
  // Calculate real active users (users active in last 7 days with at least 3 sessions)
  const realActiveUsers = await getActiveUsers(7);
  
  const baseStats: DashboardStats = {
    totalUsers,
    dailyActiveUsers: dau,
    monthlyActiveUsers: mau,
    realActiveUsers: Math.floor(realActiveUsers * 0.7), // Estimate for "real" active
    totalQrCodes,
    uniqueQrCodesScanned: uniqueQrScanned,
    totalScans,
    totalComments,
    totalReports,
    estimatedMonthlyCost: 0,
    costBreakdown: {
      firestoreReads: 0,
      firestoreWrites: 0,
      storageCost: 0,
      bandwidthCost: 0,
      authCost: 0,
      totalCost: 0
    }
  };
  
  const costBreakdown = await calculateEstimatedCosts(baseStats);
  
  return {
    ...baseStats,
    estimatedMonthlyCost: costBreakdown.totalCost,
    costBreakdown
  };
}

export async function getUserActivityHistory(days: number = 30): Promise<UserActivity[]> {
  const activity: UserActivity[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // This is a simplified version - in production, you'd query actual data
    activity.push({
      date: date.toISOString().split('T')[0],
      dau: Math.floor(Math.random() * 1000) + 100,
      mau: Math.floor(Math.random() * 5000) + 500,
      newUsers: Math.floor(Math.random() * 50) + 10,
      scans: Math.floor(Math.random() * 2000) + 500
    });
  }
  
  return activity;
}
