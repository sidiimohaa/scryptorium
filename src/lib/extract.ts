import "server-only";

/** Extracts plain text from the librarian's own notes (PDF, DOCX, TXT/MD). */
export async function extractText(fileName: string, mime: string, data: Buffer): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "txt" || ext === "md" || mime.startsWith("text/")) return data.toString("utf8");
  if (ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: data });
    return value;
  }
  if (ext === "pdf" || mime === "application/pdf") {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const { text } = await pdfText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n\n") : text;
  }
  throw new Error("Format non pris en charge (PDF, DOCX, TXT ou MD).");
}
