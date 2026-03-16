const { addonBuilder } = require("stremio-addon-sdk")
const axios = require("axios")
const { parseVideoTitle } = require("./parser")

console.log("STARTING hellspy addon v1.0.22")

const manifest = {
  id: "org.muj.hellspyaddon",
  version: "1.0.22",
  name: "HellSpy",
  description: "Search addon",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],

  idPrefixes: ["hs_"],   // ⭐ důležité

  catalogs: [
    {
      type: "movie",
      id: "hellspyaddon",
      name: "Search",
      extra: [{ name: "search", isRequired: false }]
    }
  ]
}

const builder = new addonBuilder(manifest)


// ================= CACHE =================

const cache = new Map()
const CACHE_TIME = 5 * 60 * 1000

function getCache(key) {

  const item = cache.get(key)

  if (!item) return null

  if (Date.now() > item.expire) {
    cache.delete(key)
    return null
  }

  console.log("CACHE HIT:", key)

  return item.data
}

function setCache(key, data) {

  cache.set(key, {
    data,
    expire: Date.now() + CACHE_TIME
  })

}


// ================= FETCH JSON =================

async function fetchProxy(url) {

  console.log("FETCH JSON:", url)

  const cached = getCache(url)
  if (cached) return cached

  const proxy =
    `https://pechal.cz/hellproxy/?url=${encodeURIComponent(url)}`

  try {

    const res = await axios.get(proxy, {
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": "https://hellspy.to/"
      }
    })

    let data = res.data

    if (typeof data === "string") {
      try { data = JSON.parse(data) } catch {}
    }

    if (!data) {
      console.log("EMPTY RESPONSE")
      throw new Error("Empty response")
    }

    setCache(url, data)

    return data

  } catch (e) {

    console.log("FETCH ERROR:", e.message)
    throw new Error("Proxy fetch failed")

  }

}


// ================= CATALOG =================

builder.defineCatalogHandler(async ({ extra }) => {

  console.log("CATALOG REQUEST:", extra)

  if (!extra || !extra.search)
    return { metas: [] }

  const query = extra.search.trim()

  console.log("SEARCH:", query)

  const apiUrl =
  `https://api.hellspy.to/gw/search?query=${encodeURIComponent(query)}&offset=0&limit=20`

  try {

    const data = await fetchProxy(apiUrl)

    const results = data.items || []

    setCache("search_" + query, results)

    const metas = results.map(v => {

      const parsed = parseVideoTitle(v.title)

      return {
        id: `hs_${v.id}`,
        type: "movie",
        name: parsed.title || parsed.series || v.title,
        poster: v.thumbs?.[0] || ""
      }

    })

    console.log("CATALOG RESULTS:", metas.length)

    return { metas }

  } catch (err) {

    console.log("CATALOG ERROR:", err.message)

    return { metas: [] }

  }

})


// ================= META =================

builder.defineMetaHandler(async ({ id }) => {

  console.log("META REQUEST:", id)

  for (const [key, value] of cache.entries()) {

    if (!key.startsWith("search_")) continue

    const item = value.data.find(v => `hs_${v.id}` === id)

    if (item) {

      const parsed = parseVideoTitle(item.title)

      console.log("META FROM CACHE")

      return {
        meta: {
          id,
          type: "movie",
          name: parsed.title || item.title,
          poster: item.thumbs?.[0] || "",
          description: "",
          year: parsed.year || null
        }
      }

    }

  }

  console.log("META NOT IN CACHE, fetching from API...")

  const videoId = id.replace("hs_", "")

  try {

    const videoData = await fetchProxy(
  `https://api.hellspy.to/gw/video/${videoId}`
)

    if (videoData && videoData.title) {

      const parsed = parseVideoTitle(videoData.title)

      return {
        meta: {
          id,
          type: "movie",
          name: parsed.title || parsed.series || videoData.title,
          poster: videoData.thumbs?.[0] || "",
          description: "",
          year: parsed.year || null
        }
      }

    }

  } catch (err) {

    console.log("META API ERROR:", err.message)

  }

  console.log("META NOT FOUND")

  return {
    meta: {
      id,
      type: "movie",
      name: id
    }
  }

})


// ================= STREAM =================

builder.defineStreamHandler(async ({ id }) => {


  console.log("================================")
  console.log("STREAM HANDLER CALLED")
  console.log("REQUEST ID:", id)

  if (!id.startsWith("hs_")) {

    console.log("INVALID ID (NOT HS):", id)

    return { streams: [] }

  }

  const videoId = id.replace("hs_", "")

  console.log("VIDEO ID:", videoId)

  for (const [key, value] of cache.entries()) {

    console.log("CHECK CACHE KEY:", key)

    if (!key.startsWith("search_")) continue

    const item = value.data.find(v => `hs_${v.id}` === id)

    if (!item) {
      console.log("NOT FOUND IN CACHE KEY:", key)
      continue
    }

    console.log("STREAM FOUND IN CACHE:", item.id)
    console.log("FILE HASH:", item.fileHash)

    const parsed = parseVideoTitle(item.title)

    const sizeGB = item.size
      ? (item.size / 1024 / 1024 / 1024).toFixed(1)
      : "?"

    const playUrl =
      `https://stremio-lumir.onrender.com/play/${item.fileHash}/${item.id}`

    console.log("RETURNING STREAM URL:", playUrl)

    return {
      streams: [{
        name: "HellSpy",
        description: `${parsed.quality || ""} ${parsed.audio?.join("-") || ""}`,
        title: `💾${sizeGB}GB`,
        url: playUrl
      }]
    }

  }

  console.log("STREAM NOT FOUND IN CACHE")

  return { streams: [] }

})
module.exports = builder.getInterface()
