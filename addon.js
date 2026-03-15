const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.10",
  name: "Hello World Addon",
  description: "Hellspy search addon",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "helloworldmovies",
      name: "Hellspy Search",
      extra: [{ name: "search", isRequired: false }]
    }
  ]
};

const builder = new addonBuilder(manifest);

// ---------------- SEARCH ----------------

builder.defineCatalogHandler(async (args) => {

  console.log("CATALOG REQUEST:", args);

  if (!args.extra || !args.extra.search) {
    return { metas: [] };
  }

  const query = args.extra.search.trim();
  console.log("SEARCH:", query);

  try {

    const url = `https://www.hellspy.to/?query=${encodeURIComponent(query)}`;

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      }
    });

    const $ = cheerio.load(response.data);

    const metas = [];

    $("a[href*='/film/']").each((i, el) => {

      if (i > 20) return false;

      const name = $(el).text().trim();
      const link = $(el).attr("href");

      if (!name) return;

      metas.push({
        id: encodeURIComponent(name),
        type: "movie",
        name: name,
        poster: "https://via.placeholder.com/300x450",
        externalUrl: "https://www.hellspy.to" + link
      });

    });

    console.log("Metas found:", metas.length);

    return { metas };

  } catch (e) {

    console.error("Search error:", e.message);

    return { metas: [] };

  }

});

// ---------------- META ----------------

builder.defineMetaHandler(async (args) => {

  return {
    meta: {
      id: args.id,
      type: "movie",
      name: args.id,
      poster: "https://via.placeholder.com/300x450",
      description: "Hellspy výsledky"
    }
  };

});

// ---------------- STREAM ----------------

builder.defineStreamHandler(async () => {
  return { streams: [] };
});

module.exports = builder.getInterface();
