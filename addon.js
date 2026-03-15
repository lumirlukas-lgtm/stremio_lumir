const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.13",
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
    console.log("NO SEARCH PARAM");
    return { metas: [] };
  }

  const query = extra.search.trim();
  console.log("SEARCH QUERY:", query);

  try {

    const url = `https://www.hellspy.to/?query=${encodeURIComponent(query)}`;
    console.log("FETCH URL:", url);

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      }
    });

    console.log("HELLSPY STATUS:", response.status);
    console.log("HTML SIZE:", response.data.length);
    console.log("HTML SAMPLE:", response.data.substring(0, 500));

    const $ = cheerio.load(response.data);
    const metas = [];

    const elements = $(".result-video");
    console.log("ELEMENTS FOUND:", elements.length);

    elements.each((i, el) => {

      const name = $(el).attr("title");
      const href = $(el).attr("href");

      console.log("ITEM:", name, href);

      if (!name || !href) return;

      metas.push({
        id: encodeURIComponent(href),
        type: "movie",
        name: name,
        poster: "https://via.placeholder.com/300x450"
      });

    });

    console.log("METAS COUNT:", metas.length);
    console.log("---- CATALOG HANDLER END ----");

    return { metas: metas.slice(0, 30) };

  } catch (err) {

    console.error("SEARCH ERROR:", err.message);
    console.error(err);

    return { metas: [] };

  }

});

builder.defineMetaHandler(async ({ id }) => {

  console.log("META REQUEST:", id);

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

builder.defineStreamHandler(async ({ id }) => {

  console.log("STREAM REQUEST:", id);

  return { streams: [] };

});

module.exports = builder.getInterface();
