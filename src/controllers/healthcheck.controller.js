import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (_, res) => {
  //TODO: build a healthcheck response that simply returns the OK status as json with a message
  const healthcheckResponse = {
    upTime: process.uptime(),
    responseTime: process.hrtime(),
    message: "OK",
    timestamp: Date.now(),
  };
  return res.status(200).json(healthcheckResponse);
});

export { healthcheck };
