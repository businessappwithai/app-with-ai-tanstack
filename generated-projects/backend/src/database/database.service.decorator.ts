/**
 * Database Service Decorator
 *
 * Provides injection decorator for Knex database connection.
 */

import { Inject } from "@nestjs/common";
import { KNEX_CONNECTION } from "./database.constants";

export const InjectDatabase = () => Inject(KNEX_CONNECTION);
