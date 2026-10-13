// Canonical email validation without unneeded external network failure points
import { validateEmail } from "@shared/utils/email-validator";

export async function serverValidateEmail(
  email: string,
): Promise<{ valid: boolean; error?: string }> {
  const result = validateEmail(email);
  return { valid: result.valid, error: result.reason };
}
