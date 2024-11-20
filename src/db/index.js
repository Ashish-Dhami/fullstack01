import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async () => {
  try {
    const connInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    console.log(`DB connected at ${connInstance.connection.host}:${connInstance.connection.port}/${connInstance.connection.name}`)
  } catch (err) {
      console.log(`db connection timeout ${err.message}`)
      process.exit(1)
  }
}
export default connectDB