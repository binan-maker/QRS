import { notFound } from "next/navigation";
import { getPublicQrRecord } from "../../../lib/qr-data";
import { decodeQrShareCode } from "../../../lib/qr-share";
import QrVerificationView from "./QrVerificationView";

export const dynamic = "force-dynamic";

export default async function QrVerificationPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const qrId = decodeQrShareCode(code);
  if (!qrId) notFound();

  const record = await getPublicQrRecord(qrId);
  if (!record) notFound();

  return <QrVerificationView record={record} code={code} />;
}