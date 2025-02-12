import express from "express";
import cookieparsar from "cookie-parser"
import cors from "cors"

const app = express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
    methods: ["GET", "POST"],
}))

app.use(express.json({
    limit: "20kb"
}))
app.use(express.urlencoded({extended:true, limit:"20kb"}))
app.use(express.static("public"))
app.use(cookieparsar())

export { app }

