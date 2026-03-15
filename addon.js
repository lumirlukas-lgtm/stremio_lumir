const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.8",
  name: "Hello World Addon",
  description: "Addon s online search handlerem",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "helloworldmovies",
      name: "Online filmy",
      extra: [{ name: "search", isRequired: false }],
      extraSupported: ["search"]
    }
  ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async function(args) {
  console.log("CATALOG REQUEST:", args);
  if (args.extra && args.extra.search) {
    const query = args.extra.search.trim();
    console.log("SEARCH QUERY:", query);
    try {
      const url = `https://www.example.com/?query=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { timeout: 7000 });
      const $ = cheerio.load(response.data);
      const metas = [];
      $(".film-item").each(function() {
        const name = $(this).find(".title").text().trim();
        const link = $(this).find("a").attr("href");
        const poster = $(this).find("img").attr("src") || "https://via.placeholder.com/300x450";
        if (name && link) {
          metas.push({
            id: encodeURIComponent(name),
            type: "movie",
            name: name,
            poster: poster,
            externalUrl: link
          });
        }
      });
      console.log("Metas found:", metas.length);
      return { metas };
    } catch (e) {
      console.error("Search error:", e.message);
      return { metas: [] };
    }
  }
  return { metas: [] };
});

builder.defineMetaHandler(async function(args) {
  return {
    meta: {
      id: args.id,
      type: "movie",
      name: args.id,
      poster: "https://via.placeholder.com/300x450",
      description: "Film z online search handleru"
    }
  };
});

builder.defineStreamHandler(async function(args) {
  return { streams: [] };
});

module.exports = builder.getInterface();
