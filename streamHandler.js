const { parseVideoTitle } = require("./parser")

async function streamHandler({ id }, { fetchProxy }) {

  console.log("STREAM REQUEST:", id)

  const videoId = id.replace("hs_", "")

  try {

    const url = `https://api.hellspy.to/gw/video/${videoId}`

    const data = await fetchProxy(url)

    const parsed = parseVideoTitle(data.title || "")

    const sizeGB = data.size
      ? (data.size / 1024 / 1024 / 1024).toFixed(1)
      : "?"

    const stream = {

      name: "HellSpy",

      title:
        `${parsed.quality || ""} ` +
        `${parsed.audio?.join("-") || ""} ` +
        `💾${sizeGB}GB`,

      externalUrl:
        `https://www.hellspy.to/video/${data.fileHash}/${data.id}`,

      behaviorHints: {
        bingeGroup: "hellspy"
      }

    }

    console.log("STREAM READY")

    return { streams: [stream] }

  } catch (err) {

    console.log("STREAM ERROR:", err.message)

    return { streams: [] }

  }

}

module.exports = streamHandler
