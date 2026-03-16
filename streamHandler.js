builder.defineStreamHandler(async ({ id }) => {

  console.log("================================")
  console.log("STREAM REQUEST:", id)

  if (!id.startsWith("hs_")) {
    console.log("NOT HELLSYP ID:", id)
    return { streams: [] }
  }

  const videoId = id.replace("hs_", "")

  try {

    // zjistíme název filmu
    const videoData = await fetchProxy(
      `https://api.hellspy.to/gw/video/${videoId}`
    )

    if (!videoData || !videoData.title) {

      console.log("VIDEO DATA MISSING")
      return { streams: [] }

    }

    const parsed = parseVideoTitle(videoData.title)

    const query =
      `${parsed.title || parsed.series} ${parsed.year || ""}`.trim()

    console.log("SEARCH AGAIN:", query)

    const searchData = await fetchProxy(
      `https://api.hellspy.to/gw/search?query=${encodeURIComponent(query)}&offset=0&limit=20`
    )

    const results = searchData.items || []

    console.log("STREAM RESULTS:", results.length)

    const streams = results.map(v => {

      const parsed = parseVideoTitle(v.title)

      const sizeGB = v.size
        ? (v.size / 1024 / 1024 / 1024).toFixed(1)
        : "?"

      const url =
        `https://www.hellspy.to/video/${v.fileHash}/${v.id}`

      return {
        name: "HellSpy",
        title: `${parsed.quality || ""} ${parsed.audio?.join("-") || ""} 💾${sizeGB}GB`,
        externalUrl: url,
        behaviorHints: {
          bingeGroup: "hellspy"
        }
      }

    })

    console.log("STREAMS RETURNED:", streams.length)

    return { streams }

  } catch (err) {

    console.log("STREAM ERROR:", err.message)

    return { streams: [] }

  }

})
