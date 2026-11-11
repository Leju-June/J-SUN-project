"use client";

import Link from "next/link";
import { useState } from "react";
import { withBase } from "@/lib/base-path";
import { notifyChanged } from "./useLiveData";

const COPIED_MS = 1800;

/** 공유 페이지 주소를 클립보드에 복사한다. */
export function CopyLinkButton({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${withBase(`/w/${slug}`)}`);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), COPIED_MS);
  };

  return (
    <button type="button" className="button" onClick={copy}>
      {state === "copied" ? "복사했다" : state === "failed" ? "복사 실패" : "링크 복사"}
    </button>
  );
}

type Props = { wishId: string | null; slug: string | null; rejected?: boolean };

/** 공유 검사를 요청하고, 통과하면 공유 페이지와 링크 복사를 보여준다. .actions 안에 둔다. */
export function ShareActions({ wishId, slug: initialSlug, rejected = false }: Props) {
  const [slug, setSlug] = useState(initialSlug);
  const [state, setState] = useState<"idle" | "checking" | "rejected" | "failed">(rejected ? "rejected" : "idle");

  const share = async () => {
    if (!wishId) return;
    setState("checking");
    const response = await fetch(withBase(`/api/wishes/${wishId}/share`), { method: "POST" }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { status?: string; slug?: string | null } | null;
    if (data?.status === "approved" && data.slug) {
      setSlug(data.slug);
      setState("idle");
      notifyChanged();
    } else {
      setState(data?.status ? "rejected" : "failed");
    }
  };

  if (slug) {
    return (
      <>
        <Link className="button" href={`/w/${slug}`}>
          공유 페이지 열기
        </Link>
        <CopyLinkButton slug={slug} />
      </>
    );
  }

  return (
    <>
      <button type="button" className="button" onClick={share} disabled={!wishId || state === "checking" || state === "rejected"}>
        {state === "checking" ? "검사 중..." : "공유하기"}
      </button>
      {state === "rejected" && <p className="notice actions-note">실존 인물을 특정할 수 있어 공유할 수 없다.</p>}
      {state === "failed" && <p className="notice actions-note">램프가 잠시 흔들렸다. 다시 공유해봐.</p>}
    </>
  );
}
