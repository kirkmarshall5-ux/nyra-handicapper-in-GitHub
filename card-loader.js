export const SCHEMA_VERSION = 2;

const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
const slug = value => clean(value).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function reconstructPage(items, pageNumber = 1, tolerance = 2.5) {
  const positioned = items.filter(item => clean(item.str)).map((item, index) => ({
    str: clean(item.str), x: Number(item.transform?.[4] ?? 0), y: Number(item.transform?.[5] ?? 0), index
  })).sort((a, b) => b.y - a.y || a.x - b.x || a.index - b.index);
  const rows = [];
  for (const item of positioned) {
    let row = rows.find(candidate => Math.abs(candidate.y - item.y) <= tolerance);
    if (!row) rows.push(row = { y: item.y, items: [] });
    row.items.push(item);
  }
  rows.sort((a, b) => b.y - a.y);
  return { pageNumber, items, lines: rows.map(row => ({
    pageNumber, y: row.y, items: row.items.sort((a, b) => a.x - b.x),
    text: row.items.sort((a, b) => a.x - b.x).map(item => item.str).join(" ")
  })) };
}

export function fingerprintPages(pages) {
  const source = pages.map(page => page.lines.map(line => line.text).join("\n")).join("\f");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function isStrongRaceHeader(lines, index) {
  const text = lines[index].text;
  if (!/^\s*Race\s+\d+\b/i.test(lines[index].text)) return false;
  const signals = [/\$[\d,]+/, /\b(?:Dirt|Turf|Synthetic|Tapeta)\b/i, /\b\d+(?:\s+\d\/\d)?\s*(?:F|M|furlongs?|miles?)\b/i, /\bPost\s*(?:Time)?\b/i, /\b(?:Maiden|Claiming|Allowance|Stakes|Handicap)\b/i];
  return signals.filter(pattern => pattern.test(text)).length >= 2;
}

function runnerAt(lines, index) {
  const window = lines.slice(index, index + 5).map(line => line.text).join(" ");
  if (!/\bOwn\s*:/i.test(window)) return null;
  const candidates = [lines[index]?.text, lines[index + 1]?.text].filter(Boolean);
  for (const text of candidates) {
    const match = text.match(/^\s*(\d{1,2}[A-Z]?)\s+([A-Za-z][A-Za-z0-9'’ .&-]{1,60}?)(?=\s+(?:\([^)]*\)|Own\s*:|$))/i);
    if (match) return { n: match[1].toUpperCase(), name: clean(match[2]), index };
  }
  return null;
}

export function parseCard(pages, { sourceName = "document" } = {}) {
  if (!Array.isArray(pages) || !pages.length) throw new Error("No readable PDF pages were found.");
  const lines = pages.flatMap(page => page.lines.map(line => ({ ...line, pageNumber: page.pageNumber })));
  const boundaries = [];
  lines.forEach((line, index) => { if (isStrongRaceHeader(lines, index)) boundaries.push({ index, race: +line.text.match(/Race\s+(\d+)/i)[1] }); });
  if (!boundaries.length) throw new Error("No current-card race headers were found.");
  const races = {};
  boundaries.forEach((boundary, boundaryIndex) => {
    const end = boundaries[boundaryIndex + 1]?.index ?? lines.length;
    const section = lines.slice(boundary.index, end);
    const horses = [];
    for (let i = 0; i < section.length; i++) {
      const runner = runnerAt(section, i);
      if (runner && !horses.some(horse => horse.n === runner.n && slug(horse.name) === slug(runner.name))) {
        horses.push({ n: runner.n, name: runner.name, j: "", t: "", odds: "—", ml: "—", style: "P", lifeStarts: null });
      }
    }
    races[boundary.race] = { race: boundary.race, horses, track: "", date: "", cls: clean(section.slice(0, 4).map(line => line.text).join(" · ")), dist: "", surface: "", post: "", oddsMode: "Unknown" };
  });
  const allText = lines.slice(0, 80).map(line => line.text).join(" ");
  const dateMatch = allText.match(/\b(20\d{2})[-\/]([01]?\d)[-\/]([0-3]?\d)\b/) || allText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})/i);
  let date = "";
  if (dateMatch) date = dateMatch[1].length === 4 ? `${dateMatch[1]}-${dateMatch[2].padStart(2,"0")}-${dateMatch[3].padStart(2,"0")}` : `${dateMatch[3]}-${String(new Date(`${dateMatch[1]} 1, 2000`).getMonth()+1).padStart(2,"0")}-${dateMatch[2].padStart(2,"0")}`;
  const trackMatch = allText.match(/\b(Belmont Park|Aqueduct|Saratoga|Churchill Downs|Gulfstream Park|Keeneland|Santa Anita(?: Park)?)\b/i);
  const track = trackMatch ? trackMatch[1] : "";
  Object.values(races).forEach(race => { race.track = track || "Unknown track"; race.date = date; });
  const totalRunners = Object.values(races).reduce((sum, race) => sum + race.horses.length, 0);
  if (!totalRunners) throw new Error("Race headers were found, but no bounded runner headers with program number, name, and Own: were found.");
  const fingerprint = fingerprintPages(pages);
  const id = track && date ? `v4.2:${slug(track)}:${date}` : `v4.2:${slug(track || sourceName || "unknown")}:${date || "unknown"}:${fingerprint}`;
  const warnings = [];
  if (!track || !date) warnings.push("Track/date metadata is incomplete; a document fingerprint was added to keep state collision-safe.");
  if (Object.keys(races).length === 1) warnings.push("Only one race was discovered; this may be a single-race DRF.");
  if (totalRunners < Object.keys(races).length * 3) warnings.push("The discovered fields are suspiciously small; verify the runner list.");
  return { id, schemaVersion: SCHEMA_VERSION, track: track || "Unknown track", date, races, sourceName, fingerprint, warnings };
}

export function runnerStateKey(cardId, race, runner) {
  return `${cardId}|r${race}|${runner.n || "unknown"}|${slug(runner.name)}`;
}

export function replaceCardAtomically(currentCard, pages, options) {
  try { return { card: parseCard(pages, options), replaced: true, error: null }; }
  catch (error) { return { card: currentCard, replaced: false, error }; }
}
