const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");
const { parseVideoTitle } = require("./parser");

console.log("STARTING HellSpy addon v1.0.21");

const manifest = {
  id: "org.muj.helllumiraddon",
  version: "1.0.21",
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

  console.log("CACHE SET:", key);

  cache.set(key, {
    data,
    expire: Date.now() + CACHE_TIME
  });

}



// ---------------- FETCH JSON ----------------

async function fetchProxy(url) {

  console.log("FETCH JSON:", url);

  const cached = getCache(url);
  if (cached) return cached;

  const proxies = [
    `https://rough-fire-098c.lumirlukas.workers.dev/?url=${encodeURIComponent(url)}`
  ];

  for (const proxy of proxies) {

    try {

      console.log("TRY:", proxy);

      const res = await axios.get(proxy, {
        timeout: 20000,
        validateStatus: () => true,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      
          "Accept":
            "application/json, text/plain, */*",
      
          "Accept-Language":
            "en-US,en;q=0.9",
      
          "Referer":
            "https://hellspy.to/"
        }
      });

      console.log("STATUS:", res.status);

      let data = res.data;

      if (typeof data === "string") {
        console.log("STRING RESPONSE:", data.slice(0,200));
        try {
          data = JSON.parse(data);
        } catch {}
      }

      if (!data || !data.items) {
        console.log("INVALID DATA STRUCTURE");
        continue;
      }

      console.log("ITEMS:", data.items.length);

      setCache(url, data);

      return data;

    } catch (e) {

      console.log("PROXY ERROR:", e.message);

    }

  }

  throw new Error("All proxies failed");

}


// ---------------- FETCH HTML ----------------

async function fetchHtml(url) {

  console.log("FETCH HTML:", url);

  const proxies = [
    `https://rough-fire-098c.lumirlukas.workers.dev/?url=${encodeURIComponent(url)}`,
    url
  ];

  for (const proxy of proxies) {

    try {

      console.log("TRY HTML PROXY:", proxy);

      const res = await axios.get(proxy, {
      timeout: 20000,
      validateStatus: () => true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    
        "Accept":
          "application/json, text/plain, */*",
    
        "Accept-Language":
          "en-US,en;q=0.9",
    
        "Referer":
          "https://hellspy.to/"
      }
    });

      console.log("HTML STATUS:", res.status);

      if (typeof res.data === "string") {

        console.log("HTML SIZE:", res.data.length);

        return res.data;

      }

    } catch (e) {

      console.log("HTML PROXY FAIL:", proxy);
      console.log("ERROR:", e.message);

    }

  }

  throw new Error("HTML fetch failed");

}



// ---------------- CATALOG ----------------

builder.defineCatalogHandler(async ({ extra }) => {

  console.log("CATALOG REQUEST:", extra);

  if (!extra || !extra.search) {
    console.log("NO SEARCH QUERY");
    return { metas: [] };
  }

  const query = extra.search.trim();

  console.log("SEARCH QUERY:", query);

  const apiUrl =
    `https://api.hellspy.to/gw/search?query=${encodeURIComponent(query)}&offset=0&limit=30`;

  try {

    const data = await fetchProxy(apiUrl);

    const results = data.items || [];

    console.log("RESULT COUNT:", results.length);

    const metas = results.slice(0, 30).map(v => {

      const parsed = parseVideoTitle(v.title);

      console.log("PARSED TITLE:", parsed.title || parsed.series || v.title);

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

  console.log("META REQUEST:", id);

  const videoId = id.replace("hs_", "");

  const url = `https://api.hellspy.to/gw/video/${videoId}`;

  try {

    const data = await fetchProxy(url);

    const parsed = parseVideoTitle(data.title || "");

    console.log("META TITLE:", parsed.title || data.title);

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

  console.log("STREAM REQUEST:", id);

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
