const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.15",
  name: "Hello World Addon",
  description: "Search addon",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "helloworldmovies",
      name: "Search",
      extra: [{ name: "search", isRequired: false }]
    }
  ]
};

const builder = new addonBuilder(manifest);

// --- Pomocná funkce pro proxy ---
function proxyUrl(target) {
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;
}

// --- CATALOG HANDLER ---
builder.defineCatalogHandler(async ({ extra }) => {
  if (!extra || !extra.search) return { metas: [] };

  const query = extra.search.trim();
  const target = `https://pokusne.com/gw/search?query=${encodeURIComponent(query)}&offset=0&limit=64`;

  try {
    const response = await axios.get(proxyUrl(target), { timeout: 15000 });
    const results = response.data.results || [];

    const metas = results.slice(0, 30).map(v => ({
      // Používáme jen čisté ID bez lomítek — zakódujeme ho
      id: `pokusne_${v.id}`,
      type: "movie",
      name: v.title,
      poster: v.thumbnail
    }));

    console.log("CATALOG results:", metas.length);
    return { metas };
  } catch (err) {
    console.error("CATALOG ERROR:", err.message);
    return { metas: [] };
  }
});

// --- META HANDLER ---
builder.defineMetaHandler(async ({ id }) => {
  console.log("META REQUEST:", id);

  // Dekódujeme naše ID zpět na pokusne ID
  const videoId = id.replace("pokusne_", "");
  const target = `https://pokusne.com/gw/video/${videoId}`;

  try {
    const response = await axios.get(proxyUrl(target), { timeout: 10000 });
    const data = response.data;

    return {
      meta: {
        id: id,
        type: "movie",
        name: data.title || id,
        poster: data.thumbnail || "",
        description: data.description || "",
        year: data.year || null,
        genres: data.genres || []
      }
    };
  } catch (err) {
    console.error("META ERROR:", err.message);
    // Fallback — vrátíme alespoň základní meta
    return {
      meta: {
        id: id,
        type: "movie",
        name: id.replace("pokusne_", "Video "),
        poster: ""
      }
    };
  }
});

// --- STREAM HANDLER ---
builder.defineStreamHandler(async ({ id }) => {
  console.log("STREAM REQUEST:", id);

  const videoId = id.replace("pokusne_", "");

  // Možnost 1: API endpoint pro stream URL
  try {
    const apiTarget = `https://pokusne.com/gw/video/${videoId}/streams`;
    const apiResp = await axios.get(proxyUrl(apiTarget), { timeout: 10000 });

    if (apiResp.data && apiResp.data.streams) {
      const streams = apiResp.data.streams.map(s => ({
        url: s.url,
        title: s.quality || s.label || "Stream",
        // Volitelné: behaviorHints pro lepší UX
        behaviorHints: {
          notWebReady: false
        }
      }));
      return { streams };
    }
  } catch (err) {
    console.log("API streams not found, trying scraping...");
  }

  // Možnost 2: Scraping HTML stránky videa
  try {
    const pageTarget = `https://api.hellspy.to/gw/search?query=${encodeURIComponent(query)}&offset=0&limit=64`;
    const pageResp = await axios.get(proxyUrl(pageTarget), { timeout: 15000 });
    const $ = cheerio.load(pageResp.data);

    const streams = [];

    // Hledáme přímé video tagy
    $("video source, video[src]").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src && (src.includes(".mp4") || src.includes(".m3u8"))) {
        streams.push({
          url: src.startsWith("http") ? src : `https://pokusne.com${src}`,
          title: `Zdroj ${i + 1}`
        });
      }
    });

    // Hledáme .m3u8 nebo .mp4 kdekoliv v HTML (jako string)
    const html = pageResp.data;
    const mp4Matches = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g) || [];
    const m3u8Matches = html.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/g) || [];

    [...new Set([...mp4Matches, ...m3u8Matches])].forEach((url, i) => {
      // Přidáme jen pokud ještě není v seznamu
      if (!streams.find(s => s.url === url)) {
        streams.push({
          url,
          title: url.includes(".m3u8") ? `HLS ${i + 1}` : `MP4 ${i + 1}`
        });
      }
    });

    console.log("STREAMS found:", streams.length);
    return { streams };
  } catch (err) {
    console.error("STREAM ERROR:", err.message);
    return { streams: [] };
  }
});

module.exports = builder.getInterface();
