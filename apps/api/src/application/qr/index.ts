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
  ValidationError,
} from "@binro/core";

// ─── CreateQrUseCase ──────────────────────────────────────────────────────────

export interface CreateQrInput {
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
    if (
      input.qrType && input.qrType !== "individual" ||
      input.isDynamic ||
      input.scanLimit != null ||
      input.expiryDate != null
    ) {
      throw new ValidationError("Only static individual QR codes are supported", "qrType");
    }

    const id = crypto.randomUUID();
    const qr = await this.repo.create({
      id,
      destination: input.destination.trim(),
      rawDestination: input.rawDestination,
      contentType: input.contentType,
      qrType: "individual",
      title: input.title ?? null,
      isDynamic: false,
      scanCount: 0,
      downloads: 0,
      shares: 0,
      status: "active",
      scanLimit: null,
      expiryDate: null,
      expiryPreset: null,
      businessName: null,
      template: null,
      design: (input.design as UnifiedQr["design"]) ?? { fgColor: "#0A0E17", bgColor: "#F8FAFC", logoPosition: "center", logoUri: null, label: null },
      formValues: null,
    });

    const event: QrCreatedEvent = {
      type: "QR_CREATED",
      qrId: qr.id,
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
  ): Promise<never> {
    void qrId;
    void requestingUserId;
    void newDestination;
    throw new ValidationError("Static QR codes cannot change their destination", "destination");
  }
}

// ─── DeactivateQrUseCase ──────────────────────────────────────────────────────

export class DeactivateQrUseCase {
  constructor(private readonly repo: IUnifiedQrRepository) {}

  async execute(qrId: string, requestingUserId: string): Promise<UnifiedQr> {
    const qr = await this.repo.findById(qrId);
    if (!qr) throw new QrNotFoundError(qrId);
    return this.repo.update(qrId, { status: "inactive" });
  }
}
