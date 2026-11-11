"use client";

import { useActionState } from "react";
import type { AuthState } from "@/app/actions";

type Props = {
  mode: "login" | "signup";
  next: string;
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
};

export function AuthForm({ mode, next, action }: Props) {
  const [state, submit, pending] = useActionState(action, { error: null });

  // 제출 뒤 폼이 초기화되므로, 실패했을 때는 비밀번호만 빼고 적은 값을 되살린다.
  return (
    <form action={submit}>
      <input type="hidden" name="next" value={next} />
      <label>
        이메일
        <input key={state.email ?? ""} className="field" name="email" type="email" autoComplete="email" defaultValue={state.email ?? ""} required />
      </label>
      {mode === "signup" && (
        <label>
          이름
          <input
            key={state.displayName ?? ""}
            className="field"
            name="displayName"
            type="text"
            autoComplete="nickname"
            maxLength={40}
            defaultValue={state.displayName ?? ""}
            required
          />
        </label>
      )}
      <label>
        비밀번호
        <input
          className="field"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
        />
      </label>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button" type="submit" disabled={pending}>
        {mode === "signup" ? "가입하기" : "로그인"}
      </button>
    </form>
  );
}
