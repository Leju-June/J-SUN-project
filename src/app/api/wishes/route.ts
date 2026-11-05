import { clientIp } from "@/lib/request-ip";
import { runWish, type WishEvent } from "@/lib/run-wish";
import { MAX_WISH_LENGTH, MIN_WISH_LENGTH } from "@/lib/wish-text";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < MIN_WISH_LENGTH || text.length > MAX_WISH_LENGTH) {
    return Response.json({ error: "invalid_length" }, { status: 400 });
  }

  const ip = clientIp(request.headers);
  const encoder = new TextEncoder();
  let open = true;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: WishEvent) => {
        if (open) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const close = () => {
        if (open) controller.close();
        open = false;
      };
      runWish(text, ip, emit)
        .catch((error) => {
          console.error("소원 요청 실패", error);
          emit({ type: "stopped", reason: "error" });
        })
        .finally(close);
    },
    cancel() {
      open = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
