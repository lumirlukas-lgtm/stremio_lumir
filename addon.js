const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.15",
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

  console.log("---- CATALOG HANDLER START ----");

  if (!extra || !extra.search) {
    return { metas: [] };
  }

  const query = extra.search.trim();

  const target = `https://api.hellspy.to/gw/search?query=${encodeURIComponent(query)}&offset=0&limit=64`;

  const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`;

  console.log("PROXY URL:", url);

  try {

    const response = await axios.get(url, { timeout: 15000 });

    console.log("STATUS:", response.status);

    const data = response.data;
    const results = data.results || [];

    const metas = results.map(v => ({
      id: `/video/${v.id}`,
      type: "movie",
      name: v.title,
      poster: v.thumbnail
    }));

    console.log("RESULTS:", metas.length);

    return { metas: metas.slice(0, 30) };

  } catch (err) {

    console.error("SEARCH ERROR:", err.message);
    return { metas: [] };

  }

});

builder.defineMetaHandler(async ({ id }) => {

  console.log("META REQUEST:", id);

  return {
    meta: {
      id: id,
      type: "movie",
      name: id,
      poster: "https://via.placeholder.com/300x450",
      description: "Test movie"
    }
  };

});


builder.defineStreamHandler(async ({ id }) => {

  console.log("STREAM REQUEST:", id);

  return { streams: [] };

});


module.exports = builder.getInterface();
