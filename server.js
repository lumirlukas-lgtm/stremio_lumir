const { serveHTTP, getRouter } = require("stremio-addon-sdk")
const addonInterface = require("./addon")
const express = require("express")
const axios = require("axios")
const cheerio = require("cheerio")

const port = process.env.PORT || 7000

const app = express()

// router pro addon
app.use("/", getRouter(addonInterface))

// ===== PLAY ROUTE =====
app.get("/play/:hash/:id", async (req, res) => {

  const { hash, id } = req.params
 
  console.log("PLAY ENDPOINT CALLED")
  console.log("HASH:", hash)
  console.log("ID:", id)

  try {

   
      const page =
  `https://pechal.cz/hellproxy/?url=${encodeURIComponent(`https://www.hellspy.to/video/${hash}/${id}`)}`

    const html = await axios.get(page, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://hellspy.to/",
        "Origin": "https://hellspy.to",
        "Connection": "keep-alive"
      }
    })

    const $ = cheerio.load(html.data)

    let videoSrc =
      $("video").attr("src") ||
      $("video source").attr("src") ||
      $("source").attr("src")

    console.log("VIDEO SRC:", videoSrc)

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

app.listen(port, () => {
  console.log("Addon running on port", port)
})
