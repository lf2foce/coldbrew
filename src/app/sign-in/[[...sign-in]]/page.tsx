import { SignIn } from "@clerk/nextjs";
import { BRAND } from "@/lib/brand";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-xl font-semibold" style={{ color: BRAND.accent }}>
        {BRAND.name}
      </h1>
      <SignIn />
    </main>
  );
}
