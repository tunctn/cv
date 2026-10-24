/**
 * Replies that are still being generated, kept in memory so a reloaded page
 * can pick the stream up again. One server process, so no Redis needed; a
 * restart simply ends the replay (the finished reply is saved to the DB).
 */
interface ActiveStream {
  chunks: string[];
  listeners: Set<(chunk: string | null) => void>;
}

const active = new Map<string, ActiveStream>();

export const recordStream = async (
  chatId: string,
  stream: ReadableStream<string>
) => {
  const entry: ActiveStream = { chunks: [], listeners: new Set() };
  active.set(chatId, entry);
  try {
    for await (const chunk of stream) {
      entry.chunks.push(chunk);
      for (const l of entry.listeners) {
        l(chunk);
      }
    }
  } finally {
    for (const l of entry.listeners) {
      l(null);
    }
    if (active.get(chatId) === entry) {
      active.delete(chatId);
    }
  }
};

export const replayStream = (chatId: string): ReadableStream<string> | null => {
  const entry = active.get(chatId);
  if (!entry) {
    return null;
  }
  let listener: ((chunk: string | null) => void) | null = null;
  return new ReadableStream<string>({
    start(controller) {
      for (const c of entry.chunks) {
        controller.enqueue(c);
      }
      listener = (chunk) => {
        if (chunk === null) {
          controller.close();
        } else {
          controller.enqueue(chunk);
        }
      };
      entry.listeners.add(listener);
    },
    cancel() {
      if (listener) {
        entry.listeners.delete(listener);
      }
    },
  });
};

const aborts = new Map<string, AbortController>();

export const abortControllerFor = (chatId: string) => {
  aborts.get(chatId)?.abort();
  const controller = new AbortController();
  aborts.set(chatId, controller);
  controller.signal.addEventListener("abort", () => {
    if (aborts.get(chatId) === controller) {
      aborts.delete(chatId);
    }
  });
  return controller;
};

export const stopStream = (chatId: string) => {
  aborts.get(chatId)?.abort();
};

export const releaseAbort = (chatId: string, controller: AbortController) => {
  if (aborts.get(chatId) === controller) {
    aborts.delete(chatId);
  }
};
