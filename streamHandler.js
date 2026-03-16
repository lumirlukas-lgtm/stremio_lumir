const axios = require("axios");
const cheerio = require("cheerio");
const { parseVideoTitle } = require("./parser");

async function streamHandler({ id }, { fetchProxy, fetchHtml }) {

  console.log("STREAM REQUEST:", id);

  const videoId = id.replace("hs_", "");

  const pageUrl = `https://hellspy.to/video/${videoId}`;

  try {

    const html = await fetchHtml(pageUrl);

    const $ = cheerio.load(html);

    const streams = [];

    $("video source, video").each((i, el) => {

      const src = $(el).attr("src") || $(el).attr("data-src");

      if (!src) return;

      if (src.includes(".mp4") || src.includes(".m3u8")) {

        streams.push({
          title: `HellSpy Stream ${i + 1}`,
          url: src.startsWith("http") ? src : `https://hellspy.to${src}`,
          behaviorHints: {
            bingeGroup: "hellspy"
          }
        });

      }

    });

    console.log("STREAMS FOUND:", streams.length);

    return { streams };

  } catch (err) {

    console.error("STREAM ERROR:", err.message);

    return { streams: [] };

  }

}

module.exports = streamHandler;
