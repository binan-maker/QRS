/**
 * @application/trust — Trust scoring use cases
 */

import type { QrReport } from "@binro/db";
import type { ITrustRepository } from "../../domain/trust";
import type { IQrCodeRepository } from "../../domain/qr";
import { computeTrustScore, type TrustScore } from "../../domain/trust";
import { QrNotFoundError, ForbiddenError } from "@binro/core";

// ─── ComputeTrustScoreUseCase ─────────────────────────────────────────────────

export class ComputeTrustScoreUseCase {
  constructor(
    private readonly trustRepo: ITrustRepository,
    private readonly qrRepo: IQrCodeRepository,
  ) {}

  async execute(qrId: string): Promise<TrustScore> {
    const [qr, signals] = await Promise.all([
      this.qrRepo.findById(qrId),
      this.trustRepo.getTrustSignals(qrId),
    ]);

    if (!qr) throw new QrNotFoundError(qrId);

    const score = computeTrustScore(signals);
    await this.trustRepo.saveTrustScore(qrId, score);
    return score;
  }
}

// ─── SubmitReportUseCase ──────────────────────────────────────────────────────

export interface SubmitReportInput {
  qrId: string;
  reporterId: string;
  reportType: string;
  weight: number;
  accountAgeDays: number;
  emailVerified: boolean;
  isUnified: boolean;
}

export class SubmitReportUseCase {
  constructor(
    private readonly qrRepo: IQrCodeRepository,
    private readonly trustRepo: ITrustRepository,
  ) {}

  async execute(input: SubmitReportInput): Promise<TrustScore> {
    const qr = await this.qrRepo.findById(input.qrId);
    if (!qr) throw new QrNotFoundError(input.qrId);
    if (qr.ownerId === input.reporterId) {
      throw new ForbiddenError("You cannot report your own QR");
    }

    // Recompute trust after the new report is persisted
    const signals = await this.trustRepo.getTrustSignals(input.qrId);
    const score = computeTrustScore({
      ...signals,
      reportWeight: signals.reportWeight + input.weight,
      reportCount: signals.reportCount + 1,
    });
    await this.trustRepo.saveTrustScore(input.qrId, score);
    return score;
  }
}
