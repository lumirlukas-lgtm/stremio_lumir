builder.defineStreamHandler(async ({ id }) => {

  console.log("================================")
  console.log("STREAM REQUEST ID:", id)

  if (!id.startsWith("hs_")) {

    console.log("ID není HellSpy, je to pravděpodobně IMDb:", id)
    console.log("STREAM RETURN EMPTY")

    return { streams: [] }
  }

  const videoId = id.replace("hs_", "")

  console.log("HELLSPY VIDEO ID:", videoId)

  for (const [key, value] of cache.entries()) {

    console.log("CHECK CACHE KEY:", key)

    if (!key.startsWith("search_")) continue

    const item = value.data.find(v => `hs_${v.id}` === id)

    if (!item) {
      console.log("NOT FOUND IN CACHE KEY:", key)
      continue
    }

    console.log("FOUND ITEM:", item.id)
    console.log("FILE HASH:", item.fileHash)

    const parsed = parseVideoTitle(item.title)

    const sizeGB = item.size
      ? (item.size / 1024 / 1024 / 1024).toFixed(1)
      : "?"

    const url =
      `https://www.hellspy.to/video/${item.fileHash}/${item.id}`

    console.log("STREAM URL:", url)

    return {
      streams: [{
        name: "HellSpy",
        title: `${parsed.quality || ""} ${parsed.audio?.join("-") || ""} 💾${sizeGB}GB`,
        externalUrl: url,
        behaviorHints: { bingeGroup: "hellspy" }
      }]
    }

  }

  console.log("STREAM NOT FOUND IN ANY CACHE")

  return { streams: [] }

})
