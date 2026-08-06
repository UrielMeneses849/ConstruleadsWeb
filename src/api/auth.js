import { CONSTRULEADS_TOKEN as TOKEN, CONSTRULEADS_WS_BASE_URL } from './obras.js';

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
    `${CONSTRULEADS_WS_BASE_URL}/ws_cl_login`,
    {
      method: "POST",
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
    `${CONSTRULEADS_WS_BASE_URL}/ws_cl_codigo`,
    {
      method: "POST",
      body,
    }
  );

  const text = await response.text();

  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");

  const row = xml.querySelector("row");

  const result = {
    estatus: row?.getAttribute("estatus"),
    mensaje:
      row?.getAttribute("mensaje") ||
      row?.getAttribute("msg_accesos"),
    idUsuario: row?.getAttribute("id_usuario"),
    nombreUsuario: row?.getAttribute("nombre_usuario"),
    idSession: row?.getAttribute("id_session"),
    tipoUsuario: row?.getAttribute("tipo_usuario"),
    correo: email,
    empresa:
      row?.getAttribute("empresa") ||
      row?.getAttribute("Empresa") ||
      row?.getAttribute("nombre_empresa") ||
      row?.getAttribute("Nombre_Empresa") ||
      row?.getAttribute("compania") ||
      row?.getAttribute("Compania"),
  };

  if (result.estatus === "1") {
    localStorage.setItem(
      "construleadsUser",
      JSON.stringify(result)
    );
  }

  return result;
}
