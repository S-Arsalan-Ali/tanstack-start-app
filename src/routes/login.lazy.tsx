import { createLazyFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createLazyFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return <AuthPage initialSignUp={false} />;
}
