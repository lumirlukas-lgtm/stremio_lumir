const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");
const { parseVideoTitle } = require("./parser");

const manifest = {
  id: "org.muj.helllumiraddon",
  version: "1.0.20",
  name: "HellSpy",
  description: "Search addon",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "hellspyaddon",
      name: "Search",
      extra: [{ name: "search", isRequired: false }]
    }
  ]
};

const builder = new addonBuilder(manifest);


// ---------------- CACHE ----------------

const cache = new Map();
const CACHE_TIME = 5 * 60 * 1000;

function getCache(key) {
  const item = cache.get(key);

  if (!item) return null;

  if (Date.now() > item.expire) {
    cache.delete(key);
    return null;
  }

  console.log("CACHE HIT:", key);

  return item.data;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    expire: Date.now() + CACHE_TIME
  });
}


// ---------------- FETCH JSON ----------------

async function fetchProxy(url) {

  const cached = getCache(url);
  if (cached) return cached;

const proxies = [
  `https://rough-fire-098c.lumirlukas.workers.dev/?url=${encodeURIComponent(url)}`,
  url
];

  for (const proxy of proxies) {

    try {

      console.log("TRY:", proxy);

      const res = await axios.get(proxy, { timeout: 10000 });

      let data = res.data;

      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch {}
      }

      if (!data || typeof data !== "object") {
        throw new Error("Invalid API response");
      }

      setCache(url, data);

      return data;

    } catch (e) {

      console.log("PROXY FAIL:", proxy);

    }

  }

  throw new Error("All proxies failed");

}

// ---------------- FETCH HTML ----------------

async function fetchHtml(url) {

const proxies = [
  `https://rough-fire-098c.lumirlukas.workers.dev/?url=${encodeURIComponent(url)}`,
  url
];

  for (const proxy of proxies) {

    try {

      const res = await axios.get(proxy, { timeout: 10000 });

      if (typeof res.data === "string") return res.data;

    } catch {}

  }

  throw new Error("HTML fetch failed");

}


// ---------------- CATALOG ----------------

builder.defineCatalogHandler(async ({ extra }) => {

  if (!extra || !extra.search) return { metas: [] };

  const query = extra.search.trim();

  const apiUrl =
    `https://api.hellspy.to/gw/search?query=${encodeURIComponent(query)}&offset=0&limit=64`;

  try {

    const data = await fetchProxy(apiUrl);

    const results = data.items || [];

    const metas = results.slice(0, 30).map(v => {

      const parsed = parseVideoTitle(v.title);

      return {
        id: `hs_${v.id}`,
        type: "movie",
        name: parsed.title || parsed.series || v.title,
        poster: v.thumbs?.[0] || ""
      };

    });

    console.log("CATALOG RESULTS:", metas.length);

    return { metas };

  } catch (err) {

    console.error("CATALOG ERROR:", err.message);

    return { metas: [] };

  }

});


// ---------------- META ----------------

builder.defineMetaHandler(async ({ id }) => {

  const videoId = id.replace("hs_", "");

  const url = `https://api.hellspy.to/gw/video/${videoId}`;

  try {

    const data = await fetchProxy(url);

    const parsed = parseVideoTitle(data.title || "");

    return {
      meta: {
        id,
        type: "movie",
        name: parsed.title || data.title || id,
        poster: data.thumbs?.[0] || "",
        description: data.description || "",
        year: parsed.year || data.year || null
      }
    };

  } catch (err) {

    console.error("META ERROR:", err.message);

    return {
      meta: {
        id,
        type: "movie",
        name: `Video ${videoId}`
      }
    };

  }

});


// ---------------- STREAM ----------------

builder.defineStreamHandler(async ({ id }) => {

  const videoId = id.replace("hs_", "");

  const pageUrl = `https://hellspy.to/video/${videoId}`;

  try {

    const html = await fetchHtml(pageUrl);

    const $ = cheerio.load(html);

    const streams = [];

    $("video source, video").each((i, el) => {

      const src = $(el).attr("src") || $(el).attr("data-src");

      if (!src) return;

      if (src.includes(".mp4") || src.includes(".m3u8")) {

        streams.push({
          url: src.startsWith("http") ? src : `https://hellspy.to${src}`,
          title: `Stream ${i + 1}`
        });

      }

    });

    console.log("STREAMS FOUND:", streams.length);

    return { streams };

  } catch (err) {

    console.error("STREAM ERROR:", err.message);

    return { streams: [] };

  }

});

module.exports = builder.getInterface();
