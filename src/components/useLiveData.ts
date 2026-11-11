"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CHANGED = "jeenee:changed";
const STALE_MS = 30_000;

/** 소원이나 공유가 끝나면 호출해 사이드바를 새로고침한다. */
export const notifyChanged = () => window.dispatchEvent(new Event(CHANGED));

/** 데이터와 함께 불러오기 실패 여부, 다시 불러오는 함수를 돌려준다. */
export function useLiveResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const loadedAt = useRef(0);

  const reload = useCallback(() => {
    loadedAt.current = Date.now();
    return fetch(url)
      .then((response) => (response.ok ? (response.json() as Promise<T>) : Promise.reject(new Error("load failed"))))
      .then((value) => {
        setData(value);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [url]);

  useEffect(() => {
    reload();
    // 다른 탭에 다녀왔거나 연결이 돌아오면 오래된 목록을 새로 받는다.
    const reloadIfStale = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > STALE_MS) reload();
    };
    window.addEventListener(CHANGED, reload);
    window.addEventListener("online", reload);
    document.addEventListener("visibilitychange", reloadIfStale);
    return () => {
      window.removeEventListener(CHANGED, reload);
      window.removeEventListener("online", reload);
      document.removeEventListener("visibilitychange", reloadIfStale);
    };
  }, [reload]);

  return { data, failed, reload };
}

export function useLiveData<T>(url: string) {
  return useLiveResource<T>(url).data;
}
