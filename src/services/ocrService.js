import Tesseract from "tesseract.js";

export function isPDF(file) {
  return file.type === "application/pdf";
}

export async function extractTextFromFile(file, onProgress) {
  const result = await Tesseract.recognize(file, "deu+eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text;
}
