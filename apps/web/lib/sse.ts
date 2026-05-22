// Minimal Server-Sent Events parser. The chat reply streams from the API
// gateway as `event: <name>\ndata: <json>\n\n` frames; this turns a byte
// stream into an async iterator of parsed frames.

export type SseFrame = { event: string; data: string };

export async function* readSse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line.
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        let event = "message";
        let data = "";
        for (const line of raw.split("\n")) {
          if (line.startsWith("event:")) {
            event = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            // Per spec, multiple data lines join with newlines.
            data += (data ? "\n" : "") + line.slice(5).replace(/^ /, "");
          }
        }
        if (data) yield { event, data };
      }
    }
  } finally {
    // Releasing the lock lets an aborted fetch tear the socket down.
    reader.releaseLock();
  }
}
