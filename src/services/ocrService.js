// src/services/ocrService.js
import Tesseract from "tesseract.js";

export async function extractTextFromFile(file, onProgress) {
  if (file.type === "application/pdf") {
    return extractTextFromPDF(file, onProgress);
  }
  return extractTextFromImage(file, onProgress);
}

async function extractTextFromImage(file, onProgress) {
  const result = await Tesseract.recognize(file, "deu+eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text;
}

async function extractTextFromPDF(file, onProgress) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pagesToScan = Math.min(pdf.numPages, 3);
  let fullText = "";

  for (let i = 1; i <= pagesToScan; i++) {
    onProgress && onProgress(0);
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;

    const result = await Tesseract.recognize(canvas, "deu+eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && onProgress) {
          const total = Math.round(((i - 1 + m.progress) / pagesToScan) * 100);
          onProgress(total);
        }
      },
    });
    fullText += result.data.text + "\n";
  }

  return fullText;
}
