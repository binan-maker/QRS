/**
 * @application/qr — QR use cases
 *
 * Orchestrates domain logic and repository calls.
 * No direct framework imports. Receives repository interfaces via constructor injection.
 *
 * Phase 3: route handlers call these use cases instead of accessing DB directly.
 */

import type { QrCode, UnifiedQr, NewUnifiedQr } from "@binro/db";
import type { IQrCodeRepository, IUnifiedQrRepository } from "../../domain/qr";
import {
  computeUnifiedQrStatus,
  type QrCreatedEvent,
  type QrDestinationChangedEvent,
} from "../../domain/qr";
import {
  QrNotFoundError,
  ForbiddenError,
  ValidationError,
  GovernmentQrImmutableError,
} from "@binro/core";

// ─── CreateQrUseCase ──────────────────────────────────────────────────────────

export interface CreateQrInput {
  ownerId: string;
  ownerName: string;
  destination: string;
  rawDestination: string;
  contentType: string;
  qrType?: "individual" | "business" | "government";
  title?: string;
  isDynamic?: boolean;
  scanLimit?: number;
  expiryDate?: string;
  design?: Record<string, unknown>;
}

export class CreateQrUseCase {
  constructor(private readonly repo: IUnifiedQrRepository) {}

  async execute(input: CreateQrInput): Promise<{ qr: UnifiedQr; event: QrCreatedEvent }> {
    if (!input.destination.trim()) {
      throw new ValidationError("Destination is required", "destination");
    }

    const id = crypto.randomUUID();
    const qr = await this.repo.create({
      id,
      ownerId: input.ownerId,
      ownerName: input.ownerName,
      destination: input.destination.trim(),
      rawDestination: input.rawDestination,
      contentType: input.contentType,
      qrType: input.qrType ?? "individual",
      title: input.title ?? null,
      isDynamic: input.isDynamic ?? false,
      scanCount: 0,
      downloads: 0,
      shares: 0,
      status: "active",
      scanLimit: input.scanLimit ?? null,
      expiryDate: input.expiryDate ?? null,
      expiryPreset: null,
      businessName: null,
      template: null,
      design: (input.design as UnifiedQr["design"]) ?? { fgColor: "#0A0E17", bgColor: "#F8FAFC", logoPosition: "center", logoUri: null, label: null },
      formValues: null,
    });

    const event: QrCreatedEvent = {
      type: "QR_CREATED",
      qrId: qr.id,
      ownerId: qr.ownerId,
      contentType: qr.contentType,
      timestamp: new Date(),
    };

    return { qr, event };
  }
}

// ─── UpdateQrDestinationUseCase ───────────────────────────────────────────────

export class UpdateQrDestinationUseCase {
  constructor(private readonly repo: IUnifiedQrRepository) {}

  async execute(
    qrId: string,
    requestingUserId: string,
    newDestination: string,
  ): Promise<{ qr: UnifiedQr; event: QrDestinationChangedEvent }> {
    const qr = await this.repo.findById(qrId);
    if (!qr) throw new QrNotFoundError(qrId);
    if (qr.ownerId !== requestingUserId) throw new ForbiddenError();
    if (qr.qrType === "government") throw new GovernmentQrImmutableError();
    if (!qr.isDynamic) throw new ValidationError("Only dynamic QRs can have their destination changed");

    const fromDestination = qr.destination;
    const updated = await this.repo.update(qrId, {
      destination: newDestination.trim(),
      rawDestination: newDestination.trim(),
    });

    const event: QrDestinationChangedEvent = {
      type: "QR_DESTINATION_CHANGED",
      qrId,
      fromDestination,
      toDestination: newDestination.trim(),
      changedBy: requestingUserId,
      timestamp: new Date(),
    };

    return { qr: updated, event };
  }
}

// ─── DeactivateQrUseCase ──────────────────────────────────────────────────────

export class DeactivateQrUseCase {
  constructor(private readonly repo: IUnifiedQrRepository) {}

  async execute(qrId: string, requestingUserId: string): Promise<UnifiedQr> {
    const qr = await this.repo.findById(qrId);
    if (!qr) throw new QrNotFoundError(qrId);
    if (qr.ownerId !== requestingUserId) throw new ForbiddenError();
    return this.repo.update(qrId, { status: "inactive" });
  }
}
