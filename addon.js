const { addonBuilder } = require("stremio-addon-sdk");

const builder = new addonBuilder({
  id: "org.muj.helloworldaddon",
  version: "1.0.0",
  name: "Hello World Addon",
  description: "Můj první Stremio addon!",
  resources: ["catalog"],
  types: ["movie"],
  catalogs: [
    { type: "movie", id: "helloworldmovies", name: "Hello World filmy" }
  ]
});

builder.defineCatalogHandler(function(args) {
  return Promise.resolve({
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
  });
});

module.exports = builder.getInterface();