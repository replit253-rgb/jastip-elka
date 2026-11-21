export function downloadBarcodePng(canvasId: string, trackingCode: string) {
  const canvas = document.getElementById(canvasId);
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(`Barcode ${trackingCode} belum siap diunduh. Muat ulang halaman.`);
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${trackingCode}.png`;
  link.click();
}
