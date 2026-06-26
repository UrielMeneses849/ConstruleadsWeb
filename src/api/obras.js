const TOKEN = "AS79s834925MPSUoXTKSDF56945v4FDG954ASD6Gt5G5HS965498d6548f546g65AD";

export async function obtenerObras() {
  const user = JSON.parse(
    localStorage.getItem("construleadsUser")
  );

  const body = new URLSearchParams({
    sId_usuario: user.idUsuario,
    sId_session: user.idSession,
    sTk: TOKEN,
  });

  const response = await fetch(
    "https://www.construleads.com/ws_new_cl/ws_cl.asmx/ws_cl_obras",
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