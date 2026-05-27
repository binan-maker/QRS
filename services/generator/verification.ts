import { db } from "@/lib/db/client";
import { tsToString } from "../utils";
import { logError } from "./crud";
import type { VerificationStatus } from "../types";

export type { VerificationStatus };

export async function submitVerificationRequest(
  userId: string,
  qrId: string,
  businessName: string,
  businessIdBase64: string
): Promise<void> {
  try {
    const { docs } = await db.query(["verificationRequests"], {
      where: [
        { field: "userId", op: "==", value: userId },
        { field: "qrId",   op: "==", value: qrId   },
      ],
      limit: 1,
    });
    if (docs.length > 0) {
      await db.update(["verificationRequests", docs[0].id], {
        businessName, businessIdBase64, status: "pending", updatedAt: db.timestamp(),
      });
      return;
    }
    await db.add(["verificationRequests"], {
      userId, qrId, businessName, businessIdBase64,
      status: "pending", createdAt: db.timestamp(),
    });
  } catch (e) {
    logError("submitVerificationRequest", e, { userId, qrId });
    throw e;
  }
}

export async function getVerificationStatus(userId: string, qrId: string): Promise<VerificationStatus> {
  try {
    const { docs } = await db.query(["verificationRequests"], {
      where: [
        { field: "userId", op: "==", value: userId },
        { field: "qrId",   op: "==", value: qrId   },
      ],
      limit: 1,
    });
    if (docs.length === 0) return { status: "none" };
    const d = docs[0].data;
    return {
      status: d.status || "pending",
      businessName: d.businessName,
      submittedAt: tsToString(d.createdAt),
    };
  } catch (e) {
    logError("getVerificationStatus", e, { userId, qrId });
    return { status: "none" };
  }
}
