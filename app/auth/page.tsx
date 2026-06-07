import { Suspense } from "react";
import AuthForm from "./AuthForm";

export const metadata = { title: "Log in — Aura Superfan" };

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
