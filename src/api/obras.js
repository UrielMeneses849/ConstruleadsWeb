export const CONSTRULEADS_TOKEN = "AS79s834925MPSUoXTKSDF56945v4FDG954ASD6Gt5G5HS965498d6548f546g65AD";
const isLocalDevelopment = typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);
export const CONSTRULEADS_WS_BASE_URL = isLocalDevelopment
  ? "/bimsa-ws/ws_cl.asmx"
  : "https://www.construleads.com/ws_new_cl/ws_cl.asmx";

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
      body,
    }
  );

  return await response.text();
}

export async function obtenerObrasProgresivas({
  onBatch,
  signal,
  firstBatchSize = 6,
  batchSize = 240,
} = {}) {
  const user = JSON.parse(localStorage.getItem("construleadsUser") || "{}");
  const body = new URLSearchParams({
    sId_usuario: user.idUsuario,
    sId_session: user.idSession,
    sTk: CONSTRULEADS_TOKEN,
  });

  const requestController = new AbortController();
  const handleExternalAbort = () => requestController.abort();
  signal?.addEventListener("abort", handleExternalAbort, { once: true });
  const requestTimeout = window.setTimeout(() => requestController.abort(), 60000);

  let response;
  try {
    response = await fetch(
      `${CONSTRULEADS_WS_BASE_URL}/ws_cl_obras`,
      {
        method: "POST",
        body,
        signal: requestController.signal,
      }
    );
  } catch (error) {
    window.clearTimeout(requestTimeout);
    signal?.removeEventListener("abort", handleExternalAbort);
    if (requestController.signal.aborted && !signal?.aborted) {
      throw new Error("El servicio de obras tardó demasiado en responder.", { cause: error });
    }
    throw error;
  }

  const finishRequest = () => {
    window.clearTimeout(requestTimeout);
    signal?.removeEventListener("abort", handleExternalAbort);
  };

  if (!response.ok) {
    finishRequest();
    throw new Error(`No fue posible obtener las obras (HTTP ${response.status}).`);
  }

  // El streaming de respuestas ASMX no se comporta igual en todos los motores.
  // Conservamos la ruta progresiva en Chrome, donde está verificada, y usamos
  // response.text() en Edge, Firefox y Safari para garantizar que la respuesta
  // siempre se cierre y pueda parsearse completa.
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isStableStreamingChrome =
    /Chrome\//i.test(userAgent) &&
    !/Edg\//i.test(userAgent) &&
    !/OPR\//i.test(userAgent);
  if (!isStableStreamingChrome) {
    const xml = await response.text();
    finishRequest();
    return {
      streamed: false,
      xml,
      fragments: [],
    };
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    const xml = await response.text();
    finishRequest();
    return {
      streamed: false,
      xml,
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
  finishRequest();

  return { streamed: true, xml: "", fragments };
}
