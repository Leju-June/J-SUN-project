"use client";

import { useGame } from "../game-context";

const KIND = { person: "인물", place: "장소", time: "시간", thing: "사물" } as const;

/** 단서 보관함. 추리판을 맞히면 그때 쓴 단서가 완성된 문장, 처음 적어 둔 출처와 함께 쌓인다. */
export function Archive() {
  const { view } = useGame();

  if (view.archive.length === 0) {
    return (
      <div className="archive archive-empty">
        <p>아직 보관된 단서가 없습니다.</p>
        <p>추리판을 완성하면 거기에 쓴 단서가 맥락과 함께 이곳에 자동으로 보관됩니다.</p>
      </div>
    );
  }

  return (
    <div className="archive">
      {view.archive.map((entry) => (
        <section key={entry.boardId} className="archive-entry">
          <h3>{entry.title}</h3>
          <table>
            <tbody>
              {entry.items.map((item, i) => (
                <tr key={i}>
                  <th scope="row">{item.label}</th>
                  <td className="archive-kind">{KIND[item.kind]}</td>
                  <td>{item.src ?? <span className="archive-lost">출처 메모 없음</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
