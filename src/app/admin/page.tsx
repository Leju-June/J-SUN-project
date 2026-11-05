import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ipQuotas, wishes } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { WEEKLY_FREE_WISHES, spentTodayUsd } from "@/lib/quota";
import { weekStartKst } from "@/lib/wish-text";
import { hideWishAction, loginAction, resetUsageAction, saveQuotaAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function Admin() {
  if (!(await isAdmin())) {
    if (!process.env.ADMIN_SECRET) return <p className="notice">ADMIN_SECRET이 설정되지 않아 비활성화되어 있습니다.</p>;
    return (
      <form action={loginAction} className="box">
        <h1>관리자</h1>
        <div className="wish-row">
          <input className="field" name="password" type="password" aria-label="관리자 비밀값" required />
          <button className="button">확인</button>
        </div>
      </form>
    );
  }

  const week = weekStartKst();
  const [quotas, shared, spent] = await Promise.all([
    db.select().from(ipQuotas).orderBy(desc(ipQuotas.updatedAt)).limit(200),
    db
      .select({ id: wishes.id, text: wishes.text, score: wishes.score, slug: wishes.shareSlug })
      .from(wishes)
      .where(eq(wishes.shareStatus, "approved"))
      .orderBy(desc(wishes.createdAt))
      .limit(50),
    spentTodayUsd(),
  ]);

  return (
    <>
      <h1>관리자</h1>
      <p className="notice">최근 24시간 추정 지출 ${spent.toFixed(2)}</p>

      <h2>IP 사용량</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>IP</th>
              <th>이번 주 사용</th>
              <th>주간 한도</th>
              <th>메모</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {quotas.map((quota) => (
              <tr key={quota.ip}>
                <td>{quota.ip}</td>
                <td>{quota.weekStart < week ? 0 : quota.used}</td>
                <td>{quota.allowance}</td>
                <td>{quota.note}</td>
                <td>
                  <form action={resetUsageAction}>
                    <input type="hidden" name="ip" value={quota.ip} />
                    <button className="button">사용량 초기화</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>한도 할당</h2>
      <form action={saveQuotaAction} className="actions">
        <input className="field" name="ip" placeholder="IP" aria-label="IP" required />
        <input className="field" name="allowance" type="number" min={0} defaultValue={WEEKLY_FREE_WISHES} aria-label="주간 한도" required />
        <input className="field" name="note" placeholder="메모" aria-label="메모" />
        <button className="button">저장</button>
      </form>

      <h2>공유된 소원</h2>
      {shared.map((wish) => (
        <div className="card" key={wish.id}>
          <a href={`/w/${wish.slug}`}>
            {wish.score}점 · {wish.text}
          </a>
          <form action={hideWishAction} className="actions">
            <input type="hidden" name="id" value={wish.id} />
            <button className="button">숨기기</button>
          </form>
        </div>
      ))}
    </>
  );
}
