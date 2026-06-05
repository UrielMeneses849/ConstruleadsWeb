const TOKEN =
  "AS79s834925MPSUoXTKSDF56945v4FDG954ASD6Gt5G5HS965498d6548f546g65AD";

export async function loginByEmail(email) {
  const ipResponse = await fetch(
    "https://api.ipify.org?format=json"
  );

  const { ip } = await ipResponse.json();

  const body = new URLSearchParams({
    sUsuario: email,
    sIP: ip,
    sTk: TOKEN,
  });

  const response = await fetch(
    "https://www.construleads.com/ws_new_cl/ws_cl.asmx/ws_cl_login",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    }
  );

const text = await response.text();

const parser = new DOMParser();
const xml = parser.parseFromString(text, "text/xml");

const row = xml.querySelector("row");

return {
  estatus: row?.getAttribute("estatus"),
  mensaje: row?.getAttribute("mensaje"),
  telefono: row?.getAttribute("telefono"),
};
}

export async function validarCodigo(email, codigo) {
  const ipResponse = await fetch(
    "https://api.ipify.org?format=json"
  );

  const { ip } = await ipResponse.json();

  const body = new URLSearchParams({
    sUsuario: email,
    sCodigo: codigo,
    sIP: ip,
    sTk: TOKEN,
  });

  const response = await fetch(
    "https://www.construleads.com/ws_new_cl/ws_cl.asmx/ws_cl_codigo",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  const text = await response.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");

  const row = xml.querySelector("row");

  return {
    estatus: row?.getAttribute("estatus"),
    mensaje:
      row?.getAttribute("mensaje") ||
      row?.getAttribute("msg_accesos"),
  };
}