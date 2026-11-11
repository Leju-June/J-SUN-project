import { Frame } from "@/components/Frame";

export default function Loading() {
  return (
    <Frame title="지니의 램프">
      <p className="waiting" role="status">
        램프를 문지르는 중...
      </p>
    </Frame>
  );
}
