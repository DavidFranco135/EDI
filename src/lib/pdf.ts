export const exportToPDF = async (elementId: string, filename: string) => {
  // Dynamically import html2pdf to avoid SSR issues
  const html2pdf = (await import('html2pdf.js')).default;
  const element = document.getElementById(elementId);
  if (!element) return;

  const opt = {
    margin: [8, 8, 8, 8], // top, right, bottom, left in mm
    filename,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'landscape' as const,
      compress: true,
    },
    pagebreak: { mode: ['avoid-all'] },
  };

  element.classList.add('pdf-exporting');
  try {
    await html2pdf().set(opt).from(element).save();
  } finally {
    element.classList.remove('pdf-exporting');
  }
};
