builder.defineStreamHandler(async ({ id }) => {

  console.log("================================")
  console.log("STREAM REQUEST:", id)

  if (!id.startsWith("hs_")) {
    console.log("NOT HELLSYP ID:", id)
    return { streams: [] }
  }

  const videoId = id.replace("hs_", "")

  try {

    const videoData = await fetchProxy(
      `https://api.hellspy.to/gw/video/${videoId}`
    )

    if (!videoData || !videoData.title) {
      console.log("VIDEO DATA MISSING")
      return { streams: [] }
    }

    const parsedVideo = parseVideoTitle(videoData.title)

    const query =
      `${parsedVideo.title || parsedVideo.series} ${parsedVideo.year || ""}`.trim()

    console.log("SEARCH AGAIN:", query)

    const searchData = await fetchProxy(
      `https://api.hellspy.to/gw/search?query=${encodeURIComponent(query)}&offset=0&limit=20`
    )

    const results = searchData.items || []

    console.log("STREAM RESULTS:", results.length)

    const streams = results
      .filter(v => v.fileHash && v.id)
      .map(v => {

        const parsed = parseVideoTitle(v.title)

        const sizeGB = v.size
          ? (v.size / 1024 / 1024 / 1024).toFixed(1)
          : "?"

        return {
          name: "HellSpy",
          description: `${parsed.quality || ""} ${parsed.audio?.join("-") || ""}`,
          title: `💾${sizeGB}GB`,
          externalUrl:
            `https://stremio-lumir.onrender.com/play/${v.fileHash}/${v.id}`
        }

      })

    console.log("STREAMS RETURNED:", streams.length)

    return { streams }

  } catch (err) {

    console.log("STREAM ERROR:", err.message)

    return { streams: [] }

  }

})
