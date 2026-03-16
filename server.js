const { serveHTTP } = require("stremio-addon-sdk")
const addonInterface = require("./addon")
const express = require("express")
const axios = require("axios")
const cheerio = require("cheerio")

const app = express()
const port = process.env.PORT || 7000

serveHTTP(addonInterface, { app })

app.get("/play/:hash/:id", async (req,res)=>{

  try{

    const page =
      `https://www.hellspy.to/video/${req.params.hash}/${req.params.id}`

    console.log("SCRAPE:",page)

    const html = await axios.get(page,{
      headers:{
        "User-Agent":"Mozilla/5.0"
      }
    })

    const $ = cheerio.load(html.data)

    const src = $("video").attr("src")

    if(!src){
      return res.status(404).send("video not found")
    }

    console.log("VIDEO STREAM:",src)

    res.redirect(src)

  }catch(e){

    console.log("SCRAPE ERROR:",e.message)
    res.status(500).send("error")

  }

})

app.listen(port,()=>{
  console.log("Server running:",port)
})
