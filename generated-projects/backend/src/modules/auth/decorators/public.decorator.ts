/**
 * Public Decorator
 *
 * Marks routes that don't require authentication
 *
 * Generated: 2026-05-07T09:31:28.356Z
 */

import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
