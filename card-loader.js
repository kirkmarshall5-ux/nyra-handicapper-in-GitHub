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

const TRACK_ABBREVIATIONS = { bel: "Belmont Park", aqu: "Aqueduct", sar: "Saratoga" };

function raceHeaderAt(lines, index) {
  const text = lines[index].text;
  const drfPageHeader = text.match(/^\s*([A-Za-z]{2,5})\s*,?\s*race\s+(\d+)\s*,?\s*page\s*:\s*(\d+)\b/i);
  if (drfPageHeader) {
    return { race: +drfPageHeader[2], trackAbbreviation: drfPageHeader[1].toLowerCase(), documentPage: +drfPageHeader[3], kind: "drf-page" };
  }
  const race = text.match(/^\s*Race\s+(\d+)\b/i);
  if (!race) return null;
  const signals = [/\$[\d,]+/, /\b(?:Dirt|Turf|Synthetic|Tapeta)\b/i, /\b\d+(?:\s+\d\/\d)?\s*(?:F|M|furlongs?|miles?)\b/i, /\bPost\s*(?:Time)?\b/i, /\b(?:Maiden|Claiming|Allowance|Stakes|Handicap)\b/i];
  return signals.filter(pattern => pattern.test(text)).length >= 2 ? { race: +race[1], kind: "race-heading" } : null;
}

function runnerAt(lines, index) {
  const pageNumber = lines[index]?.pageNumber;
  const pageLines = lines.filter(line => line.pageNumber === pageNumber);
  const items = pageLines.flatMap(line => line.items?.length ? line.items : [{ str: line.text, x: 0, y: line.y }]);
  const programs = items.filter(item => /^(\d{1,2}[A-Z]?)$/i.test(clean(item.str)));
  const lineItems = lines[index]?.items || [];
  const programItem = lineItems.find(item => /^(\d{1,2}[A-Z]?)$/i.test(clean(item.str)));
  if (!programItem) return null;
  const namePattern = /^[A-Za-z][A-Za-z0-9'’ .&-]{1,60}(?:\s+\([^)]*\))?$/;
  const noisePattern = /^(?:Early|Late|Own|Sire|Dam|Trainer|Jockey|Blinkers|Weight|Bred|Breeder|Mdn\w*|Turf\w*|Dirt\w*|Sprint\w*|Route\w*|Life|Timeform\w*|Beyer|Workout|Works?|Foaled|Pedigree|Stats?|Record)\b/i;
  const names = items.map(item => ({ item, text: clean(item.str) }))
    .filter(candidate => namePattern.test(candidate.text) && !noisePattern.test(candidate.text));
  const owners = items.filter(item => /^Own\s*:/i.test(clean(item.str)));
  const pairs = [];
  for (const name of names) for (const owner of owners) {
    const programToNameX = name.item.x - programItem.x;
    const programToNameY = programItem.y - name.item.y;
    const nameToOwnerX = owner.x - name.item.x;
    const nameToOwnerY = name.item.y - owner.y;
    const stacked = programToNameX >= 4 && programToNameX <= 100 && programToNameY >= 2 && programToNameY <= 36 && Math.abs(nameToOwnerX) <= 36 && nameToOwnerY >= 2 && nameToOwnerY <= 42;
    const inline = programToNameX >= 4 && programToNameX <= 100 && Math.abs(programToNameY) <= 3 && nameToOwnerX >= 4 && nameToOwnerX <= 200 && Math.abs(nameToOwnerY) <= 3;
    if (stacked || inline) pairs.push({ name, owner, score: Math.abs(programToNameX) + Math.abs(programToNameY) + Math.abs(nameToOwnerX) + Math.abs(nameToOwnerY) });
  }
  if (!pairs.length) return null;
  pairs.sort((a, b) => a.score - b.score);
  const pair = pairs[0];
  const competingPrograms = programs.filter(item => item !== programItem && Math.abs(item.x - programItem.x) <= 24 && Math.abs(item.y - pair.name.item.y) < Math.abs(programItem.y - pair.name.item.y));
  if (competingPrograms.length) return null;
  return { n: clean(programItem.str).toUpperCase(), name: clean(pair.name.text.replace(/\s+\([^)]*\)$/, "")), index };
}

export function parseCard(pages, { sourceName = "document" } = {}) {
  if (!Array.isArray(pages) || !pages.length) throw new Error("No readable PDF pages were found.");
  const lines = pages.flatMap(page => page.lines.map(line => ({ ...line, pageNumber: page.pageNumber })));
  const races = {};
  const addSection = (raceNumber, section) => {
    const horses = races[raceNumber]?.horses || [];
    for (let i = 0; i < section.length; i++) {
      const runner = runnerAt(section, i);
      if (runner && !horses.some(horse => horse.n === runner.n)) {
        horses.push({ n: runner.n, name: runner.name, j: "", t: "", odds: "—", ml: "—", style: "P", lifeStarts: null });
      }
    }
    if (!races[raceNumber]) races[raceNumber] = { race: raceNumber, horses, track: "", date: "", cls: clean(section.slice(0, 4).map(line => line.text).join(" · ")), dist: "", surface: "", post: "", oddsMode: "Unknown" };
  };
  const pageAssignments = pages.map(page => {
    const pageLines = page.lines.map(line => ({ ...line, pageNumber: page.pageNumber }));
    const footer = pageLines.map((line, index) => raceHeaderAt(pageLines, index)).find(header => header?.kind === "drf-page");
    return footer ? { page, footer } : null;
  }).filter(Boolean);
  let headers;
  if (pageAssignments.length) {
    headers = pageAssignments.map(({ footer }) => footer);
    pageAssignments.forEach(({ page, footer }) => addSection(footer.race, page.lines.map(line => ({ ...line, pageNumber: page.pageNumber }))));
  } else {
    const boundaries = [];
    lines.forEach((line, index) => { const header = raceHeaderAt(lines, index); if (header) boundaries.push({ index, ...header }); });
    if (!boundaries.length) throw new Error("No current-card race headers were found.");
    headers = boundaries;
    boundaries.forEach((boundary, boundaryIndex) => addSection(boundary.race, lines.slice(boundary.index, boundaries[boundaryIndex + 1]?.index ?? lines.length)));
  }
  const allText = lines.slice(0, 80).map(line => line.text).join(" ");
  const dateMatch = allText.match(/\b(20\d{2})[-\/]([01]?\d)[-\/]([0-3]?\d)\b/) || allText.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})/i);
  let date = "";
  if (dateMatch) date = dateMatch[1].length === 4 ? `${dateMatch[1]}-${dateMatch[2].padStart(2,"0")}-${dateMatch[3].padStart(2,"0")}` : `${dateMatch[3]}-${String(new Date(`${dateMatch[1]} 1, 2000`).getMonth()+1).padStart(2,"0")}-${dateMatch[2].padStart(2,"0")}`;
  const trackMatch = allText.match(/\b(Belmont Park|Aqueduct|Saratoga|Churchill Downs|Gulfstream Park|Keeneland|Santa Anita(?: Park)?)\b/i);
  const drfTrack = headers.find(header => header.trackAbbreviation)?.trackAbbreviation;
  const track = trackMatch ? trackMatch[1] : TRACK_ABBREVIATIONS[drfTrack] || (drfTrack ? drfTrack.toUpperCase() : "");
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
