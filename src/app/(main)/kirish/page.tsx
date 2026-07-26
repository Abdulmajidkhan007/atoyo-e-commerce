import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-16">
      {/* LoginForm ichida useSearchParams bor (Telegram kirish kodi uchun) -
          App Router uni Suspense ichida talab qiladi. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </section>
  );
}
