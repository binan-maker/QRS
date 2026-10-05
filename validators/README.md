# 🛡️ Input Validation Layer (`/validators`)

Comprehensive runtime validation layer protecting application state and API boundaries against malformed or malicious inputs.

---

## Architecture & Responsibilities

- **`auth.validator.ts`**: Validates registration/login credentials, RFC 5322 email patterns, and password strength policies.
- **`user.validator.ts`**: Enforces strict handle constraints (character sets, reserved keywords, length) and display name limits.
- **`settings.validator.ts`**: Sanitizes profile bio fields and user preference updates.
- **`scan.validator.ts`**: Analyzes QR barcode payloads, enforcing byte length limits (under 4KB) and screening for null bytes, homoglyphs, or invalid control characters.
- **`types.ts`**: Type definitions defining standardized validation results (`ValidationResult`, `EmailValidation`).
- **`index.ts`**: Unified entry point for all validators via `@/validators`.

---

## Usage

```typescript
import { validateEmail, validatePassword, validateScanContent } from "@/validators";

const emailCheck = validateEmail(emailInput);
if (!emailCheck.valid) {
  handleError(emailCheck.error);
}
```
