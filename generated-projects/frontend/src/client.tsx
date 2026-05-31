import { StartClient } from "@tanstack/start";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

export default function Client() {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
}
