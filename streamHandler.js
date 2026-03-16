const axios = require("axios")
const { parseVideoTitle } = require("./parser")

async function streamHandler({ id }, { fetchProxy }) {

  console.log("STREAM REQUEST:", id)

  try {

    // získáme název filmu z Cinemeta
    const meta = await axios.get(
      `https://v3-cinemeta.strem.io/meta/movie/${id}.json`
    )

    const title = meta.data.meta.name

    console.log("MOVIE TITLE:", title)

    // Hellspy search
    const apiUrl =
      `https://api.hellspy.to/gw/search?query=${encodeURIComponent(title)}&limit=20`

    const data = await fetchProxy(apiUrl)

    const results = data.items || []

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

        externalUrl: `https://hellspy.to/video/${v.id}`,

        behaviorHints: {
          bingeGroup: "hellspy"
        }

      }

    })

    console.log("STREAMS:", streams.length)

    return { streams }

  } catch (err) {

    console.log("STREAM ERROR:", err.message)

    return { streams: [] }

  }

}

module.exports = streamHandler
