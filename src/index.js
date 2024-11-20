import dotenv from "dotenv";
import app from "./app.js"
dotenv.config({
  path: "./.env",
});
import connectDB from "./db/index.js";

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8080 , ()=>{
      console.log(`server running at localhost:${process.env.PORT}`)
    })
  })
  .catch((error)=>{
    console.log(`error occurred while app starting -> ${error.message}`)
  })