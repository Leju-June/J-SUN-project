import Link from "next/link";
import { Frame } from "@/components/Frame";

export default function NotFound() {
  return (
    <Frame title="길을 잃었다">
      <p>여기엔 아무것도 없다. 이 길을 찾아달라는 소원은 지니도 들어줄 수 없지.</p>
      <div className="actions">
        <Link className="button" href="/">
          램프로 돌아가기
        </Link>
      </div>
    </Frame>
  );
}
