/**
 * Public Decorator
 *
 * Marks routes that don't require authentication
 *
 * Generated: 2026-08-29T04:45:21.654Z
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
