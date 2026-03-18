# Repository Layer

This directory contains the repository pattern skeleton for QR Guard.

## Purpose

The repository layer provides an abstraction between business logic and data sources.
By programming against interfaces (`IQrRepository`), features are decoupled from
Firebase implementation details — making it straightforward to swap data sources,
add caching, or write unit tests with mocks.

## Structure

```
repositories/
  interfaces/
    IQrRepository.ts      ← TypeScript interface defining the contract
  firebase/
    FirebaseQrRepository.ts ← Firebase/Firestore implementation
```

## Usage

```ts
import { FirebaseQrRepository } from "@/lib/repositories/firebase/FirebaseQrRepository";
import type { IQrRepository } from "@/lib/repositories/interfaces/IQrRepository";

const qrRepo: IQrRepository = new FirebaseQrRepository();
const qr = await qrRepo.getOrCreate("https://example.com");
```

## Extending

To add a new entity (e.g. comments, reports), follow the same pattern:
1. Define an interface in `interfaces/ICommentRepository.ts`
2. Implement it in `firebase/FirebaseCommentRepository.ts`
3. Export both from `lib/repositories/index.ts` (when ready)
