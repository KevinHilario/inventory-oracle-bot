/**
 * Extrae el texto de un .docx en el navegador (sin librerías):
 * lee el ZIP, descomprime word/document.xml con DecompressionStream y une los párrafos.
 */
async function inflateRaw(data: Uint8Array): Promise<string> {
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

export async function docxToText(file: ArrayBuffer): Promise<string> {
  const buf = new Uint8Array(file);
  const view = new DataView(file);
  let eocd = buf.length - 22;
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("El archivo no es un .docx válido.");
  const total = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  for (let i = 0; i < total; i++) {
    const metodo = view.getUint16(p + 10, true);
    const tam = view.getUint32(p + 20, true);
    const nLen = view.getUint16(p + 28, true);
    const extra = view.getUint16(p + 30, true);
    const coment = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const nombre = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nLen));
    if (nombre === "word/document.xml") {
      const ini = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const datos = buf.subarray(ini, ini + tam);
      const xml = metodo === 8 ? await inflateRaw(datos) : new TextDecoder().decode(datos);
      return xml
        .split(/<\/w:p>/)
        .map((par) => {
          const texto = [...par.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
          // Las imágenes no tienen texto: se marcan con su descripción para que el juez sepa que existen.
          const imagenes = [...par.matchAll(/<wp:docPr\b([^>]*)\/?>/g)].map((m) => {
            const attrs = m[1] ?? "";
            const descr = /descr="([^"]*)"/.exec(attrs)?.[1];
            const name = /name="([^"]*)"/.exec(attrs)?.[1];
            return ` [Imagen adjunta: ${descr || name || "captura"}]`;
          });
          return (texto + imagenes.join(""))
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&");
        })
        .filter((t) => t.trim())
        .join("\n");
    }
    p += 46 + nLen + extra + coment;
  }
  throw new Error("No se encontró el contenido del documento.");
}
