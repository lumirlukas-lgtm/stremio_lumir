const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.11",
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

builder.defineCatalogHandler(async ({ extra }) => {

  if (!extra || !extra.search) return { metas: [] };

  const query = extra.search.trim();
  console.log("SEARCH:", query);

  try {

    const url = `https://www.hellspy.to/?query=${encodeURIComponent(query)}`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      }
    });

    const $ = cheerio.load(response.data);

    const metas = [];
    const used = new Set();

    $("a[href*='/film']").each((i, el) => {

      const href = $(el).attr("href");
      const name = $(el).text().trim();

      if (!href || !name) return;

      if (used.has(name)) return;
      used.add(name);

      metas.push({
        id: encodeURIComponent(name),
        type: "movie",
        name: name,
        poster: "https://via.placeholder.com/300x450"
      });

    });

    console.log("RESULTS:", metas.length);

    return { metas: metas.slice(0, 30) };

  } catch (err) {

    console.error("SEARCH ERROR:", err.message);

    return { metas: [] };

  }

});

builder.defineMetaHandler(async ({ id }) => {

  return {
    meta: {
      id: id,
      type: "movie",
      name: decodeURIComponent(id),
      poster: "https://via.placeholder.com/300x450",
      description: "Test movie"
    }
  };

});

builder.defineStreamHandler(async () => {

  return { streams: [] };

});

module.exports = builder.getInterface();
