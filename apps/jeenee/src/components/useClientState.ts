"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_READING_SPEED, isReadingSpeed, readStored, writeStored, type ReadingSpeedId } from "@/lib/client-prefs";

const subscribeOnline = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

/** 네트워크 연결 여부. 서버 렌더와 첫 화면에서는 연결된 것으로 본다. */
export function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

const SPEED_KEY = "jeenee-speed";
const SPEED_CHANGED = "jeenee:speed";

const subscribeSpeed = (notify: () => void) => {
  window.addEventListener(SPEED_CHANGED, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(SPEED_CHANGED, notify);
    window.removeEventListener("storage", notify);
  };
};

const currentSpeed = (): ReadingSpeedId => {
  const stored = readStored("local", SPEED_KEY);
  return isReadingSpeed(stored) ? stored : DEFAULT_READING_SPEED;
};

/** 스토리 글자 속도. 한 번 고르면 다음 방문에도 유지된다. */
export function useReadingSpeed() {
  const speed = useSyncExternalStore(subscribeSpeed, currentSpeed, () => DEFAULT_READING_SPEED);
  const setSpeed = (next: ReadingSpeedId) => {
    writeStored("local", SPEED_KEY, next);
    window.dispatchEvent(new Event(SPEED_CHANGED));
  };
  return [speed, setSpeed] as const;
}
