import { createLazyFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createLazyFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  return <AuthPage initialSignUp={true} />;
}
