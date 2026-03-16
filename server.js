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

    // Krok 1: Stáhneme HTML stránku a scrapneme skutečnou video URL
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

    // Krok 2: Proxy stream — přepošleme Range hlavičku ze Stremia/prohlížeče
    // Tohle je klíčové: bez Range podpory nejde seeking (přetáčení) ve videu.
    // res.redirect() nestačí — cílový server by blokoval přímý přístup
    // a Stremio by nemohlo kontrolovat přenos.
    const rangeHeader = req.headers["range"]
    const proxyHeaders = {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://hellspy.to/"
    }
    if (rangeHeader) {
      proxyHeaders["Range"] = rangeHeader
      console.log("RANGE REQUEST:", rangeHeader)
    }

    const videoRes = await axios.get(videoSrc, {
      responseType: "stream",
      headers: proxyHeaders,
      timeout: 30000
    })

    // Krok 3: Přepošleme zpět správný HTTP status a hlavičky
    // 206 = Partial Content (seeking), 200 = celý soubor
    res.status(videoRes.status)

    if (videoRes.headers["content-type"])
      res.set("Content-Type", videoRes.headers["content-type"])

    if (videoRes.headers["content-length"])
      res.set("Content-Length", videoRes.headers["content-length"])

    if (videoRes.headers["content-range"])
      res.set("Content-Range", videoRes.headers["content-range"])

    // Accept-Ranges říká Stremiu/prohlížeči že seeking je podporován
    res.set("Accept-Ranges", "bytes")

    // Krok 4: Streamujeme data — pipe přeposílá data průběžně,
    // takže video začne hrát okamžitě bez čekání na celý soubor
    videoRes.data.pipe(res)

    // Ošetření předčasného ukončení spojení (uživatel přepne video)
    req.on("close", () => {
      videoRes.data.destroy()
    })

  } catch (err) {

    console.log("SCRAPER ERROR:", err.message)

    if (!res.headersSent)
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
