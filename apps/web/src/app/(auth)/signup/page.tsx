import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Account" };

/** /signup */
export default function SignupPage() {
  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
      {/* TODO: <SignupForm /> */}
    </div>
  );
}
