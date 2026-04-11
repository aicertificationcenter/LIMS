import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

import type { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        return {
          email: String(params.email ?? "").trim().toLowerCase(),
          name:
            typeof params.name === "string" && params.name.trim()
              ? params.name
              : String(params.legacyUsername ?? params.email ?? "사용자"),
          phone: typeof params.phone === "string" ? params.phone : undefined,
          legacyUsername:
            typeof params.legacyUsername === "string" ? params.legacyUsername : undefined,
          role:
            typeof params.role === "string" &&
            [
              "ADMIN",
              "TESTER",
              "TECH_MGR",
              "QUAL_MGR",
              "PENDING",
              "GUEST",
              "RESIGNED",
              "MANAGER",
              "CLIENT",
            ].includes(params.role)
              ? (params.role as DataModel["users"]["document"]["role"])
              : "PENDING",
          status:
            typeof params.status === "string" &&
            ["ACTIVE", "PENDING", "RESIGNED"].includes(params.status)
              ? (params.status as DataModel["users"]["document"]["status"])
              : "PENDING",
          createdAt:
            typeof params.createdAt === "number" ? params.createdAt : Date.now(),
        };
      },
      validatePasswordRequirements(password) {
        if (!password || password.length < 1) {
          throw new Error("Password is required");
        }
      },
    }),
  ],
});
