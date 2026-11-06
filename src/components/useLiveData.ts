"use client";

import { useEffect, useState } from "react";

const CHANGED = "jeenee:changed";

/** 소원이나 공유가 끝나면 호출해 사이드바를 새로고침한다. */
export const notifyChanged = () => window.dispatchEvent(new Event(CHANGED));

export function useLiveData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const load = () =>
      fetch(url)
        .then((response) => (response.ok ? response.json() : null))
        .then((value) => value && setData(value))
        .catch(() => {});
    load();
    window.addEventListener(CHANGED, load);
    return () => window.removeEventListener(CHANGED, load);
  }, [url]);

  return data;
}
