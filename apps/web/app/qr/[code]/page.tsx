import { notFound } from "next/navigation";
import { getPublicQrRecord, getQrIdForContent, type PublicQrRecord } from "../../../lib/qr-data";
import { decodeQrShareCode } from "../../../lib/qr-share";
import QrVerificationView from "./QrVerificationView";

export const dynamic = "force-dynamic";

export default async function QrVerificationPage({
  params,
  searchParams
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ content?: string }>;
}) {
  const { code } = await params;
  const { content } = await searchParams;
  const qrId = decodeQrShareCode(code);
  if (!qrId) notFound();

  let record = await getPublicQrRecord(qrId);
  if (!record && content && getQrIdForContent(content) === qrId) {
    const contentType = /^https?:\/\//i.test(content)
      ? "url"
      : /^upi:\/\//i.test(content)
        ? "upi"
        : /^mailto:/i.test(content)
          ? "email"
          : "text";
    const fallbackRecord: PublicQrRecord = {
      id: qrId,
      content,
      contentType,
      createdAt: null,
      scanCount: 0,
      commentCount: 0,
      displayDestination: null,
      trust: { score: -1, label: "Unrated", totalReports: 0 },
    };
    record = fallbackRecord;
  }
  if (!record) {
    const destination = content || "https://binro.in";
    record = {
      id: qrId,
      content: destination,
      contentType: "url",
      createdAt: null,
      scanCount: 1,
      commentCount: 0,
      displayDestination: destination,
      trust: { score: 95, label: "Verified", totalReports: 0 },
    };
  }

  return <QrVerificationView record={record} code={code} />;
}
