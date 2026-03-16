builder.defineStreamHandler(async ({ id }) => {

  console.log("STREAM REQUEST:", id)

  if (!id.startsWith("hs_"))
    return { streams: [] }

  for (const [key, value] of cache.entries()) {

    if (!key.startsWith("search_")) continue

    const item = value.data.find(v => `hs_${v.id}` === id)

    if (!item) continue

    const parsed = parseVideoTitle(item.title)

    const sizeGB = item.size
      ? (item.size / 1024 / 1024 / 1024).toFixed(1)
      : "?"

    const stream = {

      name: "HellSpy",

      title:
        `${parsed.quality || ""} ` +
        `${parsed.audio?.join("-") || ""} ` +
        `💾${sizeGB}GB`,

      externalUrl:
        `https://www.hellspy.to/video/${item.fileHash}/${item.id}`,

      behaviorHints: {
        bingeGroup: "hellspy"
      }

    }

    console.log("STREAM READY")

    return { streams: [stream] }

  }

  console.log("STREAM NOT FOUND IN CACHE")

  return { streams: [] }

})
