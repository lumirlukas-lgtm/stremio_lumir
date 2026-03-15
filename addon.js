const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.10",
  name: "Hello World Addon",
  description: "Search addon",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "helloworldmovies",
      name: "Search",
      extra: [{ name: "search", isRequired: false }],
      extraSupported: ["search"]
    }
  ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
  if (!args.extra || !args.extra.search) return { metas: [] };
  
  const query = args.extra.search.trim();
  
  try {
    const url = `https://www.hellspy.to/?query=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const $ = cheerio.load(response.data);
    const metas = [];
    
    $("a").each((i, el) => {
      const href = $(el).attr("href") || "";
      const name = $(el).text().trim();
      if (!href.includes("/film/")) return;
      if (!name) return;
      metas.push({
        id: encodeURIComponent(name),
        type: "movie",
        name: name,
        poster: "https://via.placeholder.com/300x450"
      });
    });
    
    return { metas };
  } catch (e) {
    console.error("Search error:", e.message);
    return { metas: [] };
  }
});

builder.defineMetaHandler(async (args) => {
  return {
    meta: {
      id: args.id,
      type: "movie",
      name: args.id,
      poster: "https://via.placeholder.com/300x450",
      description: "Test"
    }
  };
});

builder.defineStreamHandler(async () => {
  return { streams: [] };
});

module.exports = builder.getInterface();
