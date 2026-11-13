/** J-SUN 안에서 이 서비스가 차지하는 경로. next/link는 자동으로 붙이지만 fetch와 직접 쓴 주소에는 직접 붙여야 한다. */
export const BASE_PATH = "/j-son";

export const withBase = (path: string) => `${BASE_PATH}${path}`;
