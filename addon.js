const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const agent = new https.Agent({
  keepAlive: true
});

const manifest = {
  id: "org.muj.helloworldaddon",
  version: "1.0.14",
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


async function fetchHellspy(url) {

  for (let i = 0; i < 3; i++) {

    try {

      const response = await axios.get(url, {
        httpsAgent: agent,
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.hellspy.to/"
        }
      });

      return response;

    } catch (err) {

      if (err.response && err.response.status === 429) {

        console.log("RATE LIMITED - retry", i + 1);
        await new Promise(r => setTimeout(r, 2000));

      } else {

        throw err;

      }

    }

  }

  throw new Error("Failed after retries");
}


builder.defineCatalogHandler(async ({ extra }) => {

  console.log("---- CATALOG HANDLER START ----");

  if (!extra || !extra.search) {
    console.log("NO SEARCH PARAM");
    return { metas: [] };
  }

  const query = extra.search.trim();
  console.log("SEARCH QUERY:", query);

  try {

    const url = `https://hellspy.to/?query=${encodeURIComponent(query)}`;
    console.log("FETCH URL:", url);

    const response = await fetchHellspy(url);

    console.log("HELLSPY STATUS:", response.status);
    console.log("HTML SIZE:", response.data.length);

    const $ = cheerio.load(response.data);
    const metas = [];

    const elements = $("a.result-video");
    console.log("ELEMENTS FOUND:", elements.length);

    elements.each((i, el) => {

      const name = $(el).attr("title");
      const href = $(el).attr("href");

      if (!name || !href) return;

      console.log("ITEM:", name);

      metas.push({
        id: href,
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
