import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signupAction } from "@/app/actions";
import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/next-path";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "회원가입", robots: { index: false } };

export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);

  return (
    <section className="sheet">
      <h1>회원가입</h1>
      <AuthForm mode="signup" next={next} action={signupAction} />
      <p className="switch">
        이미 계정이 있나요? <a href={`/login?next=${encodeURIComponent(next)}`}>로그인</a>
      </p>
    </section>
  );
}
