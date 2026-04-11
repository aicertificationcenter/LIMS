/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as approvals from "../approvals.js";
import type * as auth from "../auth.js";
import type * as consultations from "../consultations.js";
import type * as dashboard from "../dashboard.js";
import type * as email from "../email.js";
import type * as evidences from "../evidences.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_mappers from "../lib/mappers.js";
import type * as lib_sampleData from "../lib/sampleData.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migration from "../migration.js";
import type * as notifications from "../notifications.js";
import type * as receptions from "../receptions.js";
import type * as tests from "../tests.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  approvals: typeof approvals;
  auth: typeof auth;
  consultations: typeof consultations;
  dashboard: typeof dashboard;
  email: typeof email;
  evidences: typeof evidences;
  files: typeof files;
  http: typeof http;
  invoices: typeof invoices;
  "lib/auth": typeof lib_auth;
  "lib/mappers": typeof lib_mappers;
  "lib/sampleData": typeof lib_sampleData;
  "lib/validators": typeof lib_validators;
  migration: typeof migration;
  notifications: typeof notifications;
  receptions: typeof receptions;
  tests: typeof tests;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
