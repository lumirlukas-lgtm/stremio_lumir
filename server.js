const { serveHTTP } = require("stremio-addon-sdk")
const addonInterface = require("./addon")
const express = require("express")
const axios = require("axios")
const cheerio = require("cheerio")

const port = Number(process.env.PORT) || 7000

// Express server
const app = express()

// ===== Video scraper =====

app.get("/play/:hash/:id", async (req, res) => {

  try {

    const { hash, id } = req.params

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

    const videoSrc = $("video").attr("src")

    if (!videoSrc) {

      console.log("VIDEO SRC NOT FOUND")

      return res.status(404).send("video not found")

    }

    console.log("VIDEO STREAM:", videoSrc)

    res.redirect(videoSrc)

  } catch (err) {

    console.log("SCRAPER ERROR:", err.message)

    res.status(500).send("error")

  }

})

// ===== Stremio addon server =====

// FIX: Odstraněno duplicitní volání app.listen()
// serveHTTP() ze Stremio SDK interně volá app.listen() samo,
// pokud mu předáme vlastní `app`. Dvojité volání způsobovalo
// chybu "listen EADDRINUSE" nebo naslouchání na špatném portu.
//
// serveHTTP přijímá { app, port } — SDK pak spustí server na správném portu
// a přidá vlastní middleware (manifest.json, cors atd.)

serveHTTP(addonInterface, { app, port })

console.log("================================")
console.log("Hellspy addon running")
console.log("Port:", port)
console.log("Manifest:", `http://localhost:${port}/manifest.json`)
console.log("================================")
