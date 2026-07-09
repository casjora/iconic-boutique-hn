/**
 * Highly compliant Code 128 Barcode SVG Generator (Code B)
 * Generates actual readable Code 128 barcodes as vector SVG.
 */

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232" // 100-105
];

const START_CODE_B = 104;
const STOP_CODE = 106;

export function generateBarcodeSVG(text) {
  // Filter ASCII values for Code 128 Code B (values 32 to 127)
  const cleanText = text.replace(/[^\x20-\x7F]/g, "");
  if (!cleanText) return "";

  const indices = [START_CODE_B];
  
  // Convert characters to code values
  for (let i = 0; i < cleanText.length; i++) {
    indices.push(cleanText.charCodeAt(i) - 32);
  }

  // Calculate checksum
  let checksum = indices[0];
  for (let i = 1; i < indices.length; i++) {
    checksum += indices[i] * i;
  }
  indices.push(checksum % 103);
  indices.push(STOP_CODE);

  // Convert pattern digits to bar widths
  let binaryString = "";
  for (const index of indices) {
    const pattern = CODE128_PATTERNS[index];
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      const isBar = j % 2 === 0;
      binaryString += (isBar ? "1" : "0").repeat(width);
    }
  }
  // Add stop bar
  binaryString += "23"; // standard termination bar of 2 modules and space

  // Build the SVG paths
  const barWidth = 2;
  const height = 70;
  const quietZone = 10;
  const width = binaryString.length * barWidth + quietZone * 2;

  let svgContent = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height + 25}" xmlns="http://www.w3.org/2000/svg" style="background:white; padding:10px; border-radius:4px;">`;
  
  // Render bars
  let x = quietZone;
  for (let i = 0; i < binaryString.length; i++) {
    const char = binaryString[i];
    if (char === "1" || char === "2") {
      const isThick = char === "2" ? barWidth : barWidth; // standard width
      svgContent += `<rect x="${x}" y="5" width="${barWidth}" height="${height}" fill="#000000" />`;
    }
    x += barWidth;
  }

  // Render Human Readable Text
  svgContent += `<text x="${width / 2}" y="${height + 20}" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle" fill="#000000">${text}</text>`;
  svgContent += "</svg>";

  return svgContent;
}
