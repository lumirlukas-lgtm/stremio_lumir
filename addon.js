const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.16",
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

// proxy fallback
async function fetchProxy(url) {

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    url
  ];

  for (const proxy of proxies) {

    try {
      const res = await axios.get(proxy, { timeout: 10000 });
      if (res.status === 200) return res.data;
    } catch (e) {}

  }

  throw new Error("All proxies failed");
}


// ---------------- CATALOG ----------------

builder.defineCatalogHandler(async ({ extra }) => {

  if (!extra || !extra.search) return { metas: [] };

  const query = extra.search.trim();

  const apiUrl =
    `https://pokusne.com/gw/search?query=${encodeURIComponent(query)}&offset=0&limit=64`;

  try {

    const data = await fetchProxy(apiUrl);
    const results = data.results || [];

    const metas = results.slice(0, 30).map(v => ({
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


// ---------------- META ----------------

builder.defineMetaHandler(async ({ id }) => {

  const videoId = id.replace("pokusne_", "");

  const url = `https://pokusne.com/gw/video/${videoId}`;

  try {

    const data = await fetchProxy(url);

    return {
      meta: {
        id,
        type: "movie",
        name: data.title || id,
        poster: data.thumbnail || "",
        description: data.description || "",
        year: data.year || null
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

  const videoId = id.replace("pokusne_", "");

  const pageUrl = `https://pokusne.com/video/${videoId}`;

  try {

    const html = await fetchProxy(pageUrl);

    const $ = cheerio.load(html);

    const streams = [];

    $("video source, video").each((i, el) => {

      const src = $(el).attr("src") || $(el).attr("data-src");

      if (!src) return;

      if (src.includes(".mp4") || src.includes(".m3u8")) {

        streams.push({
          url: src.startsWith("http") ? src : `https://pokusne.com${src}`,
          title: `Stream ${i + 1}`
        });

      }

    });

    console.log("STREAMS:", streams.length);

    return { streams };

  } catch (err) {

    console.error("STREAM ERROR:", err.message);

    return { streams: [] };

  }

});

module.exports = builder.getInterface();
