import { doc, getDoc, getFirestore, type Timestamp } from "firebase/firestore";
import { getApp, getApps, initializeApp } from "firebase/app";

export const ANDROID_APP_URL =
  "https://play.google.com/store/apps/details?id=com.qrguard.app";

export type PublicTrust = {
  score: number;
  label: string;
  totalReports: number;
};

export type PublicQrRecord = {
  id: string;
  content: string;
  contentType: string;
  createdAt: string | null;
  scanCount: number;
  commentCount: number;
  businessName: string | null;
  displayDestination: string | null;
  isActive: boolean;
  deactivationMessage: string | null;
  trust: PublicTrust;
};

type FirestoreQrDocument = {
  content?: unknown;
  contentType?: unknown;
  createdAt?: unknown;
  scanCount?: unknown;
  commentCount?: unknown;
  businessName?: unknown;
  displayDestination?: unknown;
  isActive?: unknown;
  deactivationMessage?: unknown;
  publicTrust?: {
    score?: unknown;
    label?: unknown;
    totalReports?: unknown;
  };
  trustScore?: unknown;
  trustLabel?: unknown;
  totalReports?: unknown;
};

function env(name: string): string {
  return process.env[name] ?? "";
}

function getFirebaseDb() {
  const firebaseConfig = {
    apiKey: env("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: env("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: env("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: env("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: env("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: env("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("Firebase is not configured for the web app.");
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

function timestampToString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  const timestamp = value as Partial<Timestamp>;
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  if (typeof timestamp.seconds === "number") {
    return new Date(timestamp.seconds * 1000).toISOString();
  }

  return null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function publicTrust(data: FirestoreQrDocument): PublicTrust {
  const nested = data.publicTrust;
  const score = asNumber(nested?.score ?? data.trustScore, -1);
  return {
    score: score >= 0 ? Math.round(Math.min(100, score)) : -1,
    label: asString(nested?.label ?? data.trustLabel) ?? (score >= 0 ? "Rated" : "Unrated"),
    totalReports: asNumber(nested?.totalReports ?? data.totalReports),
  };
}

function toPublicQrRecord(id: string, data: FirestoreQrDocument): PublicQrRecord | null {
  const content = asString(data.content);
  if (!content) return null;

  return {
    id,
    content,
    contentType: asString(data.contentType) ?? "text",
    createdAt: timestampToString(data.createdAt),
    scanCount: asNumber(data.scanCount),
    commentCount: asNumber(data.commentCount),
    businessName: asString(data.businessName),
    displayDestination: asString(data.displayDestination),
    isActive: data.isActive !== false,
    deactivationMessage: asString(data.deactivationMessage),
    trust: publicTrust(data),
  };
}

export async function getPublicQrRecord(qrId: string): Promise<PublicQrRecord | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "qrCodes", qrId));
  if (!snapshot.exists()) return null;
  return toPublicQrRecord(qrId, snapshot.data() as FirestoreQrDocument);
}