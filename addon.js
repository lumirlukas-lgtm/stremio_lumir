const { addonBuilder } = require("stremio-addon-sdk");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.0",
  name: "Hello World Addon",
  description: "Můj první Stremio addon!",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
  catalogs: [
    {
      type: "movie",
      id: "helloworldmovies",
      name: "Hello World filmy",
      extra: [{ name: "search", isRequired: false }]
    }
  ]
};

const builder = new addonBuilder(manifest);


// CATALOG + SEARCH
builder.defineCatalogHandler(async function(args) {

  if (args.extra && args.extra.search) {
    const query = args.extra.search;

    return {
      metas: [
        {
          id: "search-" + query,
          type: "movie",
          name: query,
          poster: "https://via.placeholder.com/300x450"
        }
      ]
    };
  }

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
