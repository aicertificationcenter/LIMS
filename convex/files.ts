import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

import { requireUser } from "./lib/auth";

export const generateDropboxUploadLink = action({
  args: {
    id: v.id("samples"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ link: string; path: string }> => {
    await requireUser(ctx);
    const sample = (await ctx.runQuery(api.migration.getSampleByIdForMigration, {
      id: args.id,
    })) as { barcode: string } | null;
    if (!sample) {
      throw new Error("Test not found");
    }

    const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
    if (!dropboxToken) {
      throw new Error("Dropbox Token missing");
    }

    const path = `/LIMS_Reports/${sample.barcode}_최종성적서.pdf`;
    const response: Response = await fetch(
      "https://api.dropboxapi.com/2/files/get_temporary_upload_link",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dropboxToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commit_info: {
            path,
            mode: { ".tag": "overwrite" },
            autorename: true,
            mute: false,
            strict_conflict: false,
          },
          duration: 3600,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Dropbox API error: ${await response.text()}`);
    }

    const data = (await response.json()) as { link: string };
    return { link: data.link as string, path };
  },
});

export const finalizeDropboxUpload = action({
  args: {
    id: v.id("samples"),
    path: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: true; url: string }> => {
    await requireUser(ctx);
    const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
    if (!dropboxToken) {
      throw new Error("Dropbox Token missing");
    }

    const createResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dropboxToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: args.path,
          settings: { requested_visibility: "public" },
        }),
      },
    );

    let sharedUrl = "";
    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      if (errorData?.error?.[".tag"] !== "shared_link_already_exists") {
        throw new Error("Dropbox Link creation failed");
      }

      const existingResponse = await fetch(
        "https://api.dropboxapi.com/2/sharing/list_shared_links",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dropboxToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: args.path }),
        },
      );
      const existingData = await existingResponse.json();
      sharedUrl = existingData.links?.[0]?.url ?? "";
    } else {
      const data = await createResponse.json();
      sharedUrl = data.url;
    }

    if (!sharedUrl) {
      throw new Error("Cannot retrieve shared Dropbox link");
    }

    await ctx.runMutation(internal.files.storeReportLinkInternal, {
      id: args.id,
      url: sharedUrl,
      path: args.path,
    });

    return { success: true, url: sharedUrl };
  },
});

export const storeReportLinkInternal = internalMutation({
  args: {
    id: v.id("samples"),
    url: v.string(),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as Id<"samples">, {
      reportFileUrl: args.url,
      reportDropboxPath: args.path,
      reportStorageType: "DROPBOX",
    });
  },
});
