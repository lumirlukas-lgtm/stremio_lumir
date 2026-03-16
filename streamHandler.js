builder.defineStreamHandler(async ({ id }) => {

  console.log("================================")
  console.log("STREAM HANDLER START")
  console.log("REQUEST ID:", id)

  if (!id) {
    console.log("ERROR: ID je undefined")
    return { streams: [] }
  }

  if (!id.startsWith("hs_")) {

    console.log("ID není HellSpy:", id)
    console.log("Pravděpodobně IMDb nebo jiný addon")

    return { streams: [] }
  }

  const videoId = id.replace("hs_", "")

  console.log("PARSED VIDEO ID:", videoId)

  console.log("CACHE SIZE:", cache.size)

  for (const [key, value] of cache.entries()) {

    console.log("----")
    console.log("CHECK CACHE KEY:", key)

    if (!key.startsWith("search_")) {
      console.log("SKIP - není search cache")
      continue
    }

    console.log("CACHE ITEMS:", value.data.length)

    const item = value.data.find(v => `hs_${v.id}` === id)

    if (!item) {

      console.log("ITEM NOT FOUND IN:", key)

      continue
    }

    console.log("ITEM FOUND!")
    console.log("ITEM ID:", item.id)
    console.log("ITEM TITLE:", item.title)

    console.log("RAW FILE HASH:", item.fileHash)

    if (!item.fileHash) {

      console.log("ERROR: FILE HASH CHYBÍ")

      console.log("FULL ITEM OBJECT:")
      console.log(JSON.stringify(item, null, 2))

      return { streams: [] }
    }

    const parsed = parseVideoTitle(item.title)

    console.log("PARSED TITLE:", parsed.title || parsed.series)

    const sizeGB = item.size
      ? (item.size / 1024 / 1024 / 1024).toFixed(1)
      : "?"

    console.log("FILE SIZE GB:", sizeGB)

    console.log("BUILDING URL...")

    const base = "https://www.hellspy.to/video"

    console.log("BASE URL:", base)
    console.log("FILE HASH:", item.fileHash)
    console.log("VIDEO ID:", item.id)

    const url =
      `${base}/${item.fileHash}/${item.id}`

    console.log("FINAL STREAM URL:")
    console.log(url)

    return {
      streams: [{
        name: "HellSpy",
        title: `${parsed.quality || ""} ${parsed.audio?.join("-") || ""} 💾${sizeGB}GB`,
        externalUrl: url,
        behaviorHints: {
          bingeGroup: "hellspy"
        }
      }]
    }

  }

  console.log("================================")
  console.log("STREAM NOT FOUND IN CACHE")
  console.log("CACHE KEYS:", [...cache.keys()])
  console.log("================================")

  return { streams: [] }

})
