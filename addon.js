const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.6",
  name: "Hello World Addon",
  description: "Addon s online search handlerem",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "helloworldmovies",
      name: "Online filmy",
      extra: [{ name: "search", isRequired: false }]
    }
  ]
};

const builder = new addonBuilder(manifest);

// --- CATALOG + SEARCH ---
builder.defineCatalogHandler(async function(args) {
  console.log("CATALOG REQUEST:", args)
  if (args.extra && args.extra.search) {
    const query = args.extra.search.trim();
    console.log("SEARCH QUERY:", query);

    try {
      // Změň URL na svůj zdroj, který vrací výsledky staticky
      const url = `https://www.hellspy.to/?query=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { timeout: 7000 });
      const $ = cheerio.load(response.data);

      const metas = [];

      // Selektory uprav podle skutečné HTML struktury stránky
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
            // externalUrl otevře odkaz přímo ve Stremiu
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

// --- META ---
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

// --- STREAM ---
builder.defineStreamHandler(async function(args) {
  // Pokud je externalUrl, Stremio otevře odkaz přímo
  return {
    streams: []
  };
});

module.exports = builder.getInterface();
