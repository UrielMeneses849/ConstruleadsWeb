export const CONSTRULEADS_TOKEN = "AS79s834925MPSUoXTKSDF56945v4FDG954ASD6Gt5G5HS965498d6548f546g65AD";
export const CONSTRULEADS_WS_BASE_URL = "https://www.construleads.com/ws_new_cl/ws_cl.asmx";

export async function obtenerObras() {
  const user = JSON.parse(
    localStorage.getItem("construleadsUser")
  );

  const body = new URLSearchParams({
    sId_usuario: user.idUsuario,
    sId_session: user.idSession,
    sTk: CONSTRULEADS_TOKEN,
  });

  const response = await fetch(
    `${CONSTRULEADS_WS_BASE_URL}/ws_cl_obras`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  return await response.text();
}

export async function obtenerObrasProgresivas({
  onBatch,
  signal,
  firstBatchSize = 15,
  batchSize = 240,
} = {}) {
  const user = JSON.parse(localStorage.getItem("construleadsUser") || "{}");
  const body = new URLSearchParams({
    sId_usuario: user.idUsuario,
    sId_session: user.idSession,
    sTk: CONSTRULEADS_TOKEN,
  });

  const response = await fetch(
    `${CONSTRULEADS_WS_BASE_URL}/ws_cl_obras`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`No fue posible obtener las obras (HTTP ${response.status}).`);
  }

  const isSafari =
    typeof navigator !== "undefined" &&
    /safari/i.test(navigator.userAgent) &&
    !/chrome|chromium|android/i.test(navigator.userAgent);
  if (isSafari) {
    return {
      streamed: false,
      xml: await response.text(),
      fragments: [],
    };
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    return {
      streamed: false,
      xml: await response.text(),
      fragments: [],
    };
  }

  const decoder = new TextDecoder();
  const fragments = [];
  let pendingFragments = [];
  let buffer = "";
  let hasPublishedFirstBatch = false;

  const publishBatch = () => {
    if (!pendingFragments.length) return;
    onBatch?.(pendingFragments);
    pendingFragments = [];
    hasPublishedFirstBatch = true;
  };

  const extractCompleteRows = () => {
    while (true) {
      const startMatch = /<datos(?:\s[^>]*)?>/i.exec(buffer);
      if (!startMatch) {
        if (buffer.length > 2048) buffer = buffer.slice(-2048);
        return;
      }

      const startIndex = startMatch.index;
      const endIndex = buffer.toLowerCase().indexOf("</datos>", startIndex);
      if (endIndex < 0) {
        if (startIndex > 0) buffer = buffer.slice(startIndex);
        return;
      }

      const fragmentEnd = endIndex + "</datos>".length;
      const fragment = buffer.slice(startIndex, fragmentEnd);
      fragments.push(fragment);
      pendingFragments.push(fragment);
      buffer = buffer.slice(fragmentEnd);

      const currentBatchSize = hasPublishedFirstBatch ? batchSize : firstBatchSize;
      if (pendingFragments.length >= currentBatchSize) publishBatch();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    extractCompleteRows();
  }

  buffer += decoder.decode();
  extractCompleteRows();
  publishBatch();

  return { streamed: true, xml: "", fragments };
}
