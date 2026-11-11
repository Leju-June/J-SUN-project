"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Frame } from "@/components/Frame";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Frame title="램프가 흔들렸다">
      <p>무언가 잘못됐다. 잠시 후 다시 시도해줘.</p>
      <div className="actions">
        <button type="button" className="button" onClick={() => retry()}>
          다시 시도
        </button>
        <Link className="button" href="/">
          처음으로
        </Link>
      </div>
    </Frame>
  );
}
