import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reset Password" };

/** /forgot-password */
export default function ForgotPasswordPage() {
  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
      {/* TODO: <ForgotPasswordForm /> */}
    </div>
  );
}
