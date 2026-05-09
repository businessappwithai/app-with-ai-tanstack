/**
 * ETag Middleware
 *
 * Implements optimistic concurrency control using ETags.
 * ETags are based on the version column in each table.
 *
 * Generated: 2026-02-09T13:00:26.929Z
 */

import * as crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Generate ETag from version number
 */
export function generateETag(version: number, id: string): string {
  const hash = crypto.createHash("md5").update(`${id}-${version}`).digest("hex");
  return `"${hash}"`;
}

/**
 * Parse ETag from header
 */
export function parseETag(etag: string | undefined): string | null {
  if (!etag) return null;
  // Remove quotes and W/ prefix if present
  return etag.replace(/^W\//, "").replace(/^"/, "").replace(/"$/, "");
}

/**
 * Extract version from ETag (if stored as version number)
 */
export function extractVersionFromETag(etag: string | undefined): number | null {
  if (!etag) return null;
  const parsed = parseETag(etag);
  if (!parsed) return null;
  // If ETag is just a number, return it
  const version = parseInt(parsed, 10);
  return isNaN(version) ? null : version;
}

/**
 * ETag middleware for GET requests
 * Sets ETag header based on response data
 */
export function setETagHeader(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = (body: any) => {
    // For single entity responses, set ETag
    if (body && typeof body === "object" && body.version !== undefined && body.id) {
      const etag = generateETag(body.version, body.id);
      res.setHeader("ETag", etag);
    }

    // For collection responses, use weak ETag based on count
    if (Array.isArray(body) && body.length > 0) {
      const hash = crypto
        .createHash("md5")
        .update(JSON.stringify(body.map((item) => item.version || 0)))
        .digest("hex");
      res.setHeader("ETag", `W/"${hash}"`);
    }

    return originalJson(body);
  };

  next();
}

/**
 * ETag middleware for PUT/PATCH requests
 * Validates If-Match header for concurrency control
 */
export function validateETag(req: Request, _res: Response, next: NextFunction): void {
  // Skip for GET/POST requests
  if (["GET", "POST"].includes(req.method)) {
    return next();
  }

  const ifMatch = req.headers["if-match"];

  // If-Match header is optional but recommended for updates
  if (!ifMatch && ["PUT", "PATCH", "DELETE"].includes(req.method)) {
    // Allow request but log warning
    console.warn(`[ETag] No If-Match header for ${req.method} ${req.path}`);
    return next();
  }

  // Store parsed ETag for use in controllers
  if (ifMatch) {
    (req as any).etag = parseETag(ifMatch as string);
    (req as any).expectedVersion = extractVersionFromETag(ifMatch as string);
  }

  next();
}

/**
 * Check if ETags match
 */
export function etagsMatch(current: string, provided: string): boolean {
  const currentParsed = parseETag(current);
  const providedParsed = parseETag(provided);

  if (!currentParsed || !providedParsed) {
    return false;
  }

  return currentParsed === providedParsed;
}

/**
 * Express error handler for concurrency conflicts
 */
export function handleConcurrencyError(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (
    err.message.includes("Concurrency conflict") ||
    err.message.includes("version mismatch") ||
    err.message.includes("ETag")
  ) {
    res.status(412).json({
      error: {
        code: "PRECONDITION_FAILED",
        message: "The resource has been modified by another user. Please refresh and try again.",
        details: err.message,
      },
    });
    return;
  }

  next(err);
}

/**
 * OData-compliant ETag response
 */
export function sendODataResponse(res: Response, data: any, statusCode: number = 200): void {
  // Set OData headers
  res.setHeader("OData-Version", "4.0");
  res.setHeader("Content-Type", "application/json;odata.metadata=minimal");

  // Set ETag for single entities
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (data.version !== undefined && data.id) {
      res.setHeader("ETag", generateETag(data.version, data.id));
    }
  }

  res.status(statusCode).json(data);
}
