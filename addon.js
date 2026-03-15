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

    // Lumir easter egg
    if (query.toLowerCase().includes("lumir")) {
      return {
        metas: [
          {
            id: "lumir-special",
            type: "movie",
            name: "👋 Ahoj Lumíre!",
            poster: "https://via.placeholder.com/300x450/6a0dad/ffffff?text=LUMIR",
            description: "Našel jsi tajný velikonoční vajíčko! 🥚"
          }
        ]
      };
    }

    // Vyhledávání na example.com
    try {
      const url = `https://www.hellspy.to/?query=${encodeURIComponent(query)}`;
      const response = await axios.get(url, { timeout: 5000 });
      const $ = cheerio.load(response.data);

      const metas = [];

      // Upravit selektory podle skutečné stránky
      $(".film-item").each(function() {
        const name = $(this).find(".title").text().trim();
        const poster = $(this).find("img").attr("src");
        const id = "ext-" + encodeURIComponent(name);
        if (name) {
          metas.push({ id, type: "movie", name, poster });
        }
      });

      // Pokud stránka nic nevrátí, zobraz aspoň placeholder
      if (metas.length === 0) {
        metas.push({
          id: "search-" + query,
          type: "movie",
          name: "Nenalezeno: " + query,
          poster: "https://via.placeholder.com/300x450"
        });
      }

      return { metas };

    } catch(e) {
      console.error("Chyba při vyhledávání:", e.message);
      return {
        metas: [
          {
            id: "error",
            type: "movie",
            name: "Chyba připojení",
            poster: "https://via.placeholder.com/300x450/ff0000/ffffff?text=ERROR"
          }
        ]
      };
    }
  }

  // Výchozí katalog
  return {
    metas: [
      {
        id: "tt0032138",
        type: "movie",
        name: "The Wizard of Oz",
        poster: "https://images.metahub.space/poster/medium/tt0032138/img"
      },
      {
        id: "tt0017136",
        type: "movie",
        name: "Metropolis",
        poster: "https://images.metahub.space/poster/medium/tt0017136/img"
      }
    ]
  };
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
