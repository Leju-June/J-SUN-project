import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { AuthForm } from "@/components/AuthForm";
import { safeNext } from "@/lib/next-path";
import { currentUser } from "@/lib/session";

export const metadata: Metadata = { title: "로그인", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);

  return (
    <section className="sheet">
      <h1>로그인</h1>
      <AuthForm mode="login" next={next} action={loginAction} />
      <p className="switch">
        처음이신가요? <a href={`/signup?next=${encodeURIComponent(next)}`}>회원가입</a>
      </p>
    </section>
  );
}
