import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In" };

/** /login */
export default function LoginPage() {
  return (
    <div className="card p-8">
      <h1 className="text-2xl font-bold text-gray-900">Sign in to BinRo</h1>
      <p className="mt-1 text-sm text-gray-500">
        Protect yourself and others from QR fraud.
      </p>
      {/* TODO: <LoginForm /> */}
    </div>
  );
}
