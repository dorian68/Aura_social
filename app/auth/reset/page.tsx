import { Suspense } from "react";
import ResetForm from "./ResetForm";

export const metadata = { title: "Reset password — Aura Superfan" };

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
