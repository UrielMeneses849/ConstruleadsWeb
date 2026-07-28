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
