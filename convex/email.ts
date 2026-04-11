"use node";

import nodemailer from "nodemailer";
import { action } from "./_generated/server";
import { v } from "convex/values";

import { requireUser } from "./lib/auth";

export const send = action({
  args: {
    subject: v.string(),
    content: v.string(),
    recipients: v.array(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          filename: v.string(),
          content: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    if (args.recipients.length === 0) {
      throw new Error("수신자 목록이 올바르지 않습니다.");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "mail.aicerti.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || "ai@aicerti.com",
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"한국인공지능검증원" <${process.env.SMTP_USER || "ai@aicerti.com"}>`,
      to: args.recipients[0],
      bcc: args.recipients.slice(1).length > 0 ? args.recipients.slice(1) : undefined,
      subject: args.subject,
      text: args.content,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${args.content.replace(/\n/g, "<br>")}</div>`,
      attachments: args.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, "base64"),
      })),
    });

    return { message: "메일이 성공적으로 발송되었습니다.", count: args.recipients.length };
  },
});
