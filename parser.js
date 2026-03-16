/**
 * Video Title Parser
 *
 * Filmy:
 *   "Matrix 3 (2003)(1080p)(Remastered)(CZ-EN-SK) PHDTeam"  → title: "Matrix 3"
 *   "Blade Runner 2049 (2017) [2160p] HDR"                  → title: "Blade Runner 2049"
 *
 * Seriály:
 *   "Breaking.Bad.S03E07.1080p.CZ"        → series: "Breaking Bad", season: 3, episode: 7
 *   "Game.of.Thrones.3x05.720p"           → series: "Game of Thrones", season: 3, episode: 5
 *   "Severance.S02E01-E05.WEBRip.CZ"      → series: "Severance", season: 2, episodes: [1..5]
 *   "House.MD.S04.1080p"                  → series: "House MD", season: 4 (celá série)
 *   "Squid.Game.(2021).S01E03.1080p.CZ"   → series: "Squid Game", season: 1, episode: 3
 */

const TECHNICAL_KEYWORDS = [
  "2160p", "1080p", "720p", "480p", "4K", "HDR", "SDR", "DV",
  "BluRay", "BRRip", "WEBRip", "WEB-DL", "HDTV", "DVDRip", "AMZN", "NF", "DSNP", "HMAX", "ATVP",
  "x264", "x265", "HEVC", "AVC", "H264", "H265", "10bit", "8bit",
  "AAC", "AC3", "DTS", "Dolby", "Atmos", "TrueHD",
  "Remastered", "Extended", "Directors.Cut", "Theatrical", "REMUX", "PROPER", "REPACK", "RETAIL",
  "CZ", "SK", "EN", "PL", "DE", "FR", "ES", "HU"
];

const KNOWN_TEAMS = [
  "PHDTeam", "YTS", "YIFY", "FGT", "RARBG", "EVO", "SPARKS",
  "AMIABLE", "GECKOS", "NTG", "ION10", "WUTANG", "FLAME", "HDCLUB"
];

function expandEpisodeRange(from, to) {
  const result = [];
  for (let i = from; i <= to; i++) result.push(i);
  return result;
}

function cleanTitle(input, { year, audio, team, seriesTagPattern }) {
  let t = input;

  // Ořízni vše od seriálového tagu dál
  if (seriesTagPattern) {
    const idx = t.search(new RegExp(seriesTagPattern, "i"));
    if (idx !== -1) t = t.slice(0, idx);
  }

  // Závorky
  t = t.replace(/\(.*?\)/g, " ").replace(/\[.*?\]/g, " ");

  // Team
  if (team) t = t.replace(new RegExp("\\b" + team + "\\b", "gi"), " ");

  // Technická slova
  for (const kw of TECHNICAL_KEYWORDS) {
    const escaped = kw.replace(/\./g, "\\.?");
    t = t.replace(new RegExp("\\b" + escaped + "\\b", "gi"), " ");
  }

  // Rok
  if (year) {
    t = t.replace(
      new RegExp("(?:^|[\\s\\.\\-_\\(\\[])(" + year + ")(?:[\\s\\.\\-_\\)\\]]|$)", "g"), " "
    );
  }

  // Audio
  if (audio) {
    const audioStr = audio.join("-");
    t = t.replace(new RegExp("\\b" + audioStr + "\\b", "gi"), " ");
    for (const lang of audio) {
      t = t.replace(new RegExp("(?:^|[\\s\\-])(?:" + lang + ")(?:[\\s\\-]|$)", "gi"), " ");
    }
  }

  // Tečky → mezery (scene formát)
  t = t.replace(/\./g, " ");

  return t.replace(/[-_\s]+$|^[-_\s]+/g, "").replace(/\s+/g, " ").trim();
}

/**
 * @param {string} raw
 * @returns {{
 *   type: "movie"|"series",
 *   title: string|null,
 *   series: string|null,
 *   season: number|null,
 *   episode: number|null,
 *   episodes: number[]|null,
 *   year: string|null,
 *   quality: string|null,
 *   audio: string[]|null,
 *   team: string|null,
 *   tags: string[],
 *   original: string
 * }}
 */
function parseVideoTitle(raw) {
  let input = raw.replace(/\.(mkv|mp4|avi|mov|wmv|flv|m4v)$/i, "").trim();

  const result = {
    type: "movie",
    title: null,
    series: null,
    season: null,
    episode: null,
    episodes: null,
    year: null,
    quality: null,
    audio: null,
    team: null,
    tags: [],
    original: raw
  };

  // ── Rok ──────────────────────────────────────────────────────────────────
  const yearInBrackets = input.match(/[\(\[](19[0-9]{2}|20[0-9]{2})[\)\]]/);
  const yearStandalone = input.match(/(?<=[\s\.\-_])(19[0-9]{2}|20[0-9]{2})(?=[\s\.\-_()\[]|$)/);
  const yearMatch = yearInBrackets || yearStandalone;
  if (yearMatch) result.year = yearMatch[1] || yearMatch[0];

  // ── Kvalita ──────────────────────────────────────────────────────────────
  const qualityMatch = input.match(/\b(2160p|1080p|720p|480p|4K)\b/i);
  if (qualityMatch) result.quality = qualityMatch[0].toLowerCase();

  // ── Audio ────────────────────────────────────────────────────────────────
  const audioMatch = input.match(/\b((?:CZ|SK|EN|PL|DE|FR|ES|HU)(?:-(?:CZ|SK|EN|PL|DE|FR|ES|HU))*)\b/i);
  if (audioMatch) result.audio = audioMatch[0].toUpperCase().split("-");

  // ── Release team ─────────────────────────────────────────────────────────
  for (const team of KNOWN_TEAMS) {
    if (input.includes(team)) { result.team = team; break; }
  }

  // ── Tagy ─────────────────────────────────────────────────────────────────
  const tagPatterns = [
    /\bRemastered\b/i, /\bExtended\b/i, /\bDirector[s']?.?Cut\b/i,
    /\bTheatrical\b/i, /\bHDR\b/i, /\bDV\b/, /\bREMUX\b/i,
    /\bPROPER\b/i, /\bREPACK\b/i
  ];
  for (const pat of tagPatterns) {
    const m = input.match(pat);
    if (m) result.tags.push(m[0]);
  }

  // ── Detekce seriálového tagu ─────────────────────────────────────────────
  let seriesTagPattern = null;

  // S03E01-E05 (rozsah)
  const rangeMatch = input.match(/[Ss](\d{1,2})[Ee](\d{1,3})-[Ee](\d{1,3})/);
  if (rangeMatch) {
    result.type = "series";
    result.season = parseInt(rangeMatch[1], 10);
    result.episodes = expandEpisodeRange(parseInt(rangeMatch[2], 10), parseInt(rangeMatch[3], 10));
    result.episode = result.episodes[0];
    seriesTagPattern = "[Ss]\\d{1,2}[Ee]\\d{1,3}-[Ee]\\d{1,3}";
  }

  // S03E01E02E03 (více epizod za sebou)
  if (!seriesTagPattern) {
    const multiMatch = input.match(/[Ss](\d{1,2})((?:[Ee]\d{1,3}){2,})/);
    if (multiMatch) {
      result.type = "series";
      result.season = parseInt(multiMatch[1], 10);
      result.episodes = [...multiMatch[2].matchAll(/[Ee](\d{1,3})/g)].map(m => parseInt(m[1], 10));
      result.episode = result.episodes[0];
      seriesTagPattern = "[Ss]\\d{1,2}(?:[Ee]\\d{1,3})+";
    }
  }

  // S03E07 (jedna epizoda)
  if (!seriesTagPattern) {
    const seMatch = input.match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
    if (seMatch) {
      result.type = "series";
      result.season = parseInt(seMatch[1], 10);
      result.episode = parseInt(seMatch[2], 10);
      seriesTagPattern = "[Ss]\\d{1,2}[Ee]\\d{1,3}";
    }
  }

  // 3x07 (alternativní formát)
  if (!seriesTagPattern) {
    const altMatch = input.match(/\b(\d{1,2})x(\d{2,3})\b/i);
    if (altMatch) {
      result.type = "series";
      result.season = parseInt(altMatch[1], 10);
      result.episode = parseInt(altMatch[2], 10);
      seriesTagPattern = "\\d{1,2}x\\d{2,3}";
    }
  }

  // S04 (celá série bez epizody)
  if (!seriesTagPattern) {
    const seasonOnly = input.match(/\b[Ss](\d{1,2})\b(?!\s*[Ee]\d)/);
    if (seasonOnly) {
      result.type = "series";
      result.season = parseInt(seasonOnly[1], 10);
      seriesTagPattern = "[Ss]\\d{1,2}";
    }
  }

  // ── Čistý název ──────────────────────────────────────────────────────────
  const cleaned = cleanTitle(input, {
    year: result.year,
    audio: result.audio,
    team: result.team,
    seriesTagPattern
  });

  if (result.type === "series") {
    result.series = cleaned;
  } else {
    result.title = cleaned;
  }

  return result;
}

// ── Testy ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const tests = [
    "Matrix 3 (2003)(1080p)(Remastered)(CZ-EN-SK) PHDTeam",
    "Blade Runner 2049 (2017) [2160p] HDR",
    "The.Dark.Knight.2008.1080p.BluRay.CZ",
    "Dune Part Two 2024 1080p WEB-DL CZ-EN-SK PHDTeam.mkv",
    "Breaking.Bad.S03E07.1080p.CZ",
    "Game.of.Thrones.3x05.720p",
    "Severance.S02E01-E05.WEBRip.CZ-EN",
    "House.MD.S04.1080p",
    "Squid.Game.(2021).S01E03.1080p.CZ",
    "The.Last.of.Us.S01E01E02.720p.WEB-DL.CZ-SK PHDTeam.mkv",
    "Stranger.Things.S04E09.2160p.HDR.DSNP.CZ-EN",
  ];

  for (const t of tests) {
    const r = parseVideoTitle(t);
    console.log(`\nVSTUP:    ${t}`);
    console.log(`TYP:      ${r.type}`);
    if (r.type === "series") {
      console.log(`SERIÁL:   ${r.series}`);
      console.log(`SÉRIE:    S${String(r.season).padStart(2,"0")}`);
      if (r.episodes) {
        console.log(`EPIZODY:  E${r.episodes.map(e => String(e).padStart(2,"0")).join(", E")}`);
      } else {
        console.log(`EPIZODA:  ${r.episode != null ? "E" + String(r.episode).padStart(2,"0") : "— (celá série)"}`);
      }
    } else {
      console.log(`NÁZEV:    ${r.title}`);
    }
    console.log(`ROK:      ${r.year ?? "—"}`);
    console.log(`KVALITA:  ${r.quality ?? "—"}`);
    console.log(`AUDIO:    ${r.audio ? r.audio.join(", ") : "—"}`);
    console.log(`TEAM:     ${r.team ?? "—"}`);
    console.log(`TAGY:     ${r.tags.join(", ") || "—"}`);
  }
}

module.exports = { parseVideoTitle };
