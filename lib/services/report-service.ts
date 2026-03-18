import { firestore, firebaseAuth } from "../firebase";
import {
  doc,
  collection,
  getDoc,
  setDoc,
  getDocs,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { notifyQrFollowers } from "./notification-service";

async function calculateReporterWeight(userId: string | null, emailVerified: boolean): Promise<number> {
  if (!userId) return 0.3;
  let weight = 1.0;
  if (emailVerified) weight += 0.3;
  try {
    const snap = await getDoc(doc(firestore, "users", userId));
    if (snap.exists()) {
      const createdAt = snap.data().createdAt;
      if (createdAt) {
        const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const ageDays = (Date.now() - d.getTime()) / 86400000;
        if (ageDays >= 90) weight += 0.3;
        else if (ageDays >= 30) weight += 0.2;
      }
    }
  } catch {}
  return Math.min(weight, 1.8);
}

export async function getQrReportCounts(qrId: string): Promise<Record<string, number>> {
  const snap = await getDocs(collection(firestore, "qrCodes", qrId, "reports"));
  const counts: Record<string, number> = {};
  snap.forEach((d) => {
    const { reportType } = d.data();
    counts[reportType] = (counts[reportType] || 0) + 1;
  });
  return counts;
}

export async function getUserQrReport(qrId: string, userId: string): Promise<string | null> {
  const snap = await getDoc(doc(firestore, "qrCodes", qrId, "reports", userId));
  return snap.exists() ? snap.data().reportType : null;
}

export async function reportQrCode(
  qrId: string,
  userId: string,
  reportType: string,
  emailVerified: boolean = false
): Promise<Record<string, number>> {
  const weight = await calculateReporterWeight(userId, emailVerified);
  await setDoc(doc(firestore, "qrCodes", qrId, "reports", userId), {
    reportType, weight, reporterId: userId, createdAt: serverTimestamp(),
  });
  notifyQrFollowers(qrId, "new_report", `New ${reportType} report on a QR you follow`, userId).catch(() => {});
  return getQrReportCounts(qrId);
}

export function subscribeToQrReports(
  qrId: string,
  onUpdate: (counts: Record<string, number>) => void
): () => void {
  const reportsRef = collection(firestore, "qrCodes", qrId, "reports");
  return onSnapshot(
    reportsRef,
    (snap) => {
      const counts: Record<string, number> = {};
      snap.forEach((d) => {
        const { reportType } = d.data();
        counts[reportType] = (counts[reportType] || 0) + 1;
      });
      onUpdate(counts);
    },
    () => {}
  );
}
