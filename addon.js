const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.4",
  name: "Hello World Addon",
  description: "Můj první Stremio addon!",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "helloworldmovies",
      name: "Hello World filmy",
      extra: [{ name: "search", isRequired: false }],
      extraSupported: ["search"]
    }
  ]
};

const builder = new addonBuilder(manifest);

// CATALOG + SEARCH
builder.defineCatalogHandler(async function(args) {
  if (args.extra && args.extra.search) {
    const query = args.extra.search;

    try {
      const url = `https://www.hellspy.to/?query=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { timeout: 5000 });
      const $ = cheerio.load(response.data);

      const metas = [];
      $(".film-item").each(function() {
        const name = $(this).find(".title").text().trim();
        const poster = $(this).find("img").attr("src");
        const id = "ext-" + encodeURIComponent(name);
        if (name) metas.push({ id, type: "movie", name, poster });
      });

      return { metas };

    } catch(e) {
      console.error("Chyba:", e.message);
      return { metas: [] };
    }
  }

  return { metas: [] };
});

// META
builder.defineMetaHandler(async function(args) {
  return {
    meta: {
      id: args.id,
      type: "movie",
      name: "Test film",
      poster: "https://via.placeholder.com/300x450",
      description: "Test metadata"
    }
  };
});

// STREAM
builder.defineStreamHandler(async function(args) {
  return {
    streams: [
      {
        title: "Test Stream",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ]
  };
});

module.exports = builder.getInterface();
