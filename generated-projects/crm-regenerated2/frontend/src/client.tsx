import { StartClient } from "@tanstack/start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { getRouter } from "./router";

export default function Client() {
  const router = getRouter();
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient router={router} />
    </StrictMode>,
  );
}
