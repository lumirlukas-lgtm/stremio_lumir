const { addonBuilder } = require("stremio-addon-sdk")
const axios = require("axios")
const cheerio = require("cheerio")
const { parseVideoTitle } = require("./parser")

console.log("STARTING HellSpy addon v1.0.22")

const manifest = {
  id: "org.muj.helllumiraddon",
  version: "1.0.22",
  name: "HellSpy",
  description: "Search addon",
  resources: ["catalog", "meta", "stream"],
  types: ["movie"],
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

  const proxy = `https://pechal.cz/hellproxy/?url=${encodeURIComponent(url)}`

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

    if (!data || !data.items) {
      console.log("INVALID JSON STRUCTURE")
      throw new Error("Invalid JSON")
    }

    console.log("ITEMS:", data.items.length)

    setCache(url, data)

    return data

  } catch (e) {

    console.log("FETCH ERROR:", e.message)

    throw new Error("Proxy fetch failed")

  }

}


// ================= FETCH HTML =================

async function fetchHtml(url) {

  console.log("FETCH HTML:", url)

  const proxy = `https://pechal.cz/hellproxy/?url=${encodeURIComponent(url)}`

  try {

    const res = await axios.get(proxy, {
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://hellspy.to/"
      }
    })

    if (typeof res.data === "string") {

      console.log("HTML SIZE:", res.data.length)

      return res.data

    }

  } catch (e) {

    console.log("HTML FETCH ERROR:", e.message)

  }

  throw new Error("HTML fetch failed")

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

  console.log("STREAM REQUEST:", id)

  const videoId = id.replace("hs_", "")

  const pageUrl = `https://hellspy.to/video/${videoId}`

  try {

    const html = await fetchHtml(pageUrl)

    const $ = cheerio.load(html)

    const streams = []

    $("video source, video").each((i, el) => {

      const src = $(el).attr("src") || $(el).attr("data-src")

      if (!src) return

      if (src.includes(".mp4") || src.includes(".m3u8")) {

        streams.push({
          url: src.startsWith("http") ? src : `https://hellspy.to${src}`,
          title: `HellSpy Stream ${i + 1}`,
          behaviorHints: {
            bingeGroup: "hellspy"
          }
        })

      }

    })

    console.log("STREAMS:", streams.length)

    return { streams }

  } catch (err) {

    console.log("STREAM ERROR:", err.message)

    return { streams: [] }

  }

})

module.exports = builder.getInterface()
