import { Suspense } from "react";
import OnboardingForm from "./OnboardingForm";

export const metadata = {
  title: "Launch your Fan Club — Aura",
  description: "Create your Superfan Club in minutes. Reward your most loyal fans with points, challenges, and exclusive rewards.",
};

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
