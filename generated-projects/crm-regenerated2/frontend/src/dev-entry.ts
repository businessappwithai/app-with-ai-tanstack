// Dev-only entry point that imports and invokes the client hydration function.
// This is loaded via a <script type="module"> tag in development mode only.
// In production, Vinxi handles client bootstrapping via the route manifest.
import '/_build/@vite/client';
import Client from './client';
Client();
