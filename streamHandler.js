const axios = require("axios")
const { parseVideoTitle } = require("./parser")

async function streamHandler({ id }, { fetchProxy }) {

  console.log("STREAM REQUEST:", id)

  try {

    let title

    // pokud je to IMDB id
    if (id.startsWith("tt")) {

      const meta = await axios.get(
        `https://v3-cinemeta.strem.io/meta/movie/${id}.json`
      )

      title = meta.data.meta.name

      console.log("CINEMETA TITLE:", title)

    } else {

      // pokud je to Hellspy id
      const videoId = id.replace("hs_", "")

      const data = await fetchProxy(
        `https://api.hellspy.to/gw/video/${videoId}`
      )

      title = data.title

      console.log("HELLSPY TITLE:", title)

    }

    // hledání na Hellspy
    const searchUrl =
      `https://api.hellspy.to/gw/search?query=${encodeURIComponent(title)}&limit=10`

    const search = await fetchProxy(searchUrl)

    const results = search.items || []

    const streams = results.map(v => {

      const parsed = parseVideoTitle(v.title)

      const sizeGB = v.size
        ? (v.size / 1024 / 1024 / 1024).toFixed(1)
        : "?"

      return {

        name: "HellSpy",

        title:
          `${parsed.quality || ""} ` +
          `${parsed.audio?.join("-") || ""} ` +
          `💾${sizeGB}GB`,

        externalUrl:
          `https://www.hellspy.to/video/${v.fileHash}/${v.id}`,

        behaviorHints: {
          bingeGroup: "hellspy"
        }

      }

    })

    console.log("STREAM COUNT:", streams.length)

    return { streams }

  } catch (err) {

    console.log("STREAM ERROR:", err.message)

    return { streams: [] }

  }

}

module.exports = streamHandler
