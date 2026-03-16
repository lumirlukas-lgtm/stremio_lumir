const { serveHTTP } = require("stremio-addon-sdk")
const addonInterface = require("./addon")
const express = require("express")
const axios = require("axios")
const cheerio = require("cheerio")

const port = Number(process.env.PORT) || 7000

const app = express()

// ===== PLAY ROUTE =====

app.get("/play/:hash/:id", async (req, res) => {

  const { hash, id } = req.params

  console.log("PLAY ENDPOINT CALLED")
  console.log("HASH:", hash)
  console.log("ID:", id)

  try {

    const page =
      `https://www.hellspy.to/video/${hash}/${id}`

    console.log("SCRAPE PAGE:", page)

    const html = await axios.get(page, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://hellspy.to/"
      }
    })

    const $ = cheerio.load(html.data)

    let videoSrc =
      $("video").attr("src") ||
      $("video source").attr("src") ||
      $("source").attr("src")

    console.log("VIDEO SRC FOUND:", videoSrc)

    if (!videoSrc)
      return res.status(404).send("video not found")

    const videoRes = await axios.get(videoSrc, {
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://hellspy.to/",
        "Origin": "https://hellspy.to"
      }
    })

    res.set("Content-Type", videoRes.headers["content-type"])
    res.set("Accept-Ranges", "bytes")

    videoRes.data.pipe(res)

  } catch (err) {

    console.log("PLAY ERROR:", err.message)

    res.status(500).send("error")

  }

})

// ===== ADDON SERVER =====

serveHTTP(addonInterface, { app, port })

console.log("================================")
console.log("HellSpy addon running")
console.log("Port:", port)
console.log("================================")
