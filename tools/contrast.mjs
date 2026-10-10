const pairs = [
  ["text on surface", "#f5f7fa", "#0d0f12", 4.5],
  ["muted on surface", "#a7afb9", "#0d0f12", 4.5],
  ["green on surface", "#34d399", "#0d0f12", 3],
  ["amber on surface", "#fbbf24", "#0d0f12", 3],
  ["red on surface", "#fb7185", "#0d0f12", 3],
  ["light text on surface", "#101217", "#ffffff", 4.5],
  ["light muted on surface", "#4e5661", "#ffffff", 4.5],
  ["light green on surface", "#087f5b", "#ffffff", 3],
  ["light amber on surface", "#8c5c00", "#ffffff", 3],
  ["light red on surface", "#b4234d", "#ffffff", 3],
];

function channel(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [value >> 16, (value >> 8) & 255, value & 255].map((part) => part / 255).map((part) => part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4);
}

function ratio(foreground, background) {
  const fg = channel(foreground);
  const bg = channel(background);
  const luminance = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const results = pairs.map(([label, foreground, background, minimum]) => ({ label, ratio: ratio(foreground, background), minimum }));
const failures = results.filter((result) => result.ratio < result.minimum);
console.table(results.map((result) => ({ ...result, ratio: result.ratio.toFixed(2), pass: result.ratio >= result.minimum })));
if (failures.length > 0) process.exitCode = 1;
