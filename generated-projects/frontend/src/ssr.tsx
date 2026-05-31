import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/start/server";
import { getRouter } from "./router";

export default createStartHandler({ createRouter: getRouter })(
  defaultStreamHandler,
);
