import { api } from "../../convex/_generated/api.js";
import {
  clearStoredAuthTokens,
  createConvexHttpClient,
  storeAuthTokens,
} from "../convexClient";

type FetchLikeOptions = RequestInit & { body?: BodyInit | null };

const parseBody = (body?: BodyInit | null) => {
  if (!body || typeof body !== "string") {
    return {};
  }
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const authedClient = () => createConvexHttpClient(true);
const anonClient = () => createConvexHttpClient(false);

export const apiClient = {
  fetch: async (endpoint: string, options: FetchLikeOptions = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const payload = parseBody(options.body);

    if (endpoint === "/receptions" && method === "PATCH") {
      return await authedClient().mutation(api.receptions.updateDetails, payload as never);
    }
    if (endpoint === "/consultations" && method === "POST") {
      return await authedClient().mutation(api.consultations.create, payload as never);
    }
    if (endpoint === "/consultations" && method === "PATCH") {
      return await authedClient().mutation(api.consultations.update, payload as never);
    }
    if (endpoint === "/evidences" && method === "POST") {
      return await authedClient().mutation(api.evidences.createMetadata, payload as never);
    }
    if (endpoint === "/evidences" && method === "DELETE") {
      return await authedClient().mutation(api.evidences.deleteEvidence, payload as never);
    }

    throw new Error(`Unsupported API call: ${method} ${endpoint}`);
  },

  auth: {
    login: async (identifier: string, password: string) => {
      const normalized = identifier.trim();
      const resolved =
        normalized.includes("@")
          ? { email: normalized.toLowerCase() }
          : await anonClient().query(
              "users:resolveLoginEmail" as never,
              { identifier: normalized } as never,
            );
      if (!resolved?.email) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }
      let result;
      try {
        result = await anonClient().action(api.auth.signIn, {
          provider: "password",
          params: { email: resolved.email, password, flow: "signIn" },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : typeof error === "string" ? error : "";
        if (message.includes("InvalidSecret")) {
          throw new Error("비밀번호가 일치하지 않습니다.");
        }
        if (message.includes("InvalidAccountId")) {
          throw new Error("사용자를 찾을 수 없습니다.");
        }
        throw error;
      }
      if (!result.tokens) {
        throw new Error("로그인 토큰을 받지 못했습니다.");
      }
      storeAuthTokens(result.tokens);
      return await authedClient().query(api.users.current, {});
    },
    register: async (data: {
      id: string;
      pw: string;
      email: string;
      phone: string;
      name: string;
    }) => {
      await anonClient().action(api.auth.signIn, {
        provider: "password",
        params: {
          email: data.email,
          password: data.pw,
          flow: "signUp",
          name: data.name,
          phone: data.phone,
          legacyUsername: data.id,
          role: "PENDING",
          status: "PENDING",
          createdAt: Date.now(),
        },
      });
      clearStoredAuthTokens();
    },
    current: () => authedClient().query(api.users.current, {}),
    logout: () => authedClient().action(api.auth.signOut, {}),
  },

  users: {
    current: () => authedClient().query(api.users.current, {}),
    list: () => authedClient().query(api.users.list, {}),
    updateProfile: (data: {
      id: string;
      name?: string;
      email?: string;
      phone?: string;
    }) => authedClient().mutation(api.users.updateProfile, data as never),
    updateRole: (data: { id: string; role: string }) =>
      authedClient().mutation(api.users.updateRole, data as never),
    approve: (id: string, role?: string) =>
      authedClient().mutation(api.users.approvePending, { id, role } as never),
    delete: (id: string) => authedClient().mutation(api.users.deleteUser, { id } as never),
    adminResetPassword: (id: string, newPassword: string) =>
      authedClient().action(api.users.adminResetPassword, { id, newPassword } as never),
  },

  notifications: {
    list: (userId: string) =>
      authedClient().query(api.notifications.listUnread, { userId } as never),
    markAsRead: (userId: string) =>
      authedClient().mutation(api.notifications.markAllRead, { userId } as never),
  },

  tests: {
    listMyTasks: (testerId: string) =>
      authedClient().query(api.tests.listMyTasks, { testerId } as never),
  },

  consultations: {
    list: (sampleId: string) =>
      authedClient().query(api.consultations.list, { sampleId } as never),
    create: (data: { sampleId: string; authorId?: string; message: string }) =>
      authedClient().mutation(api.consultations.create, data as never),
    update: (id: string, data: { message: string; authorId?: string }) =>
      authedClient().mutation(api.consultations.update, { id, ...data } as never),
  },

  evidences: {
    list: (sampleId: string) =>
      authedClient().query(api.evidences.list, { sampleId } as never),
    create: (data: {
      sampleId: string;
      fileName: string;
      fileType: string;
      fileUrl?: string;
      dropboxPath?: string;
      dataUrl?: string;
    }) => authedClient().mutation(api.evidences.createMetadata, data as never),
    delete: (id: string) =>
      authedClient().mutation(api.evidences.deleteEvidence, { id } as never),
  },

  receptions: {
    list: () => authedClient().query(api.receptions.list, {}),
    create: (data: {
      client: string;
      clientName: string;
      phone: string;
      email: string;
      bizNo?: string;
      target: string;
      extra?: string;
    }) => authedClient().mutation(api.receptions.create, data as never),
    assign: (id: string, testerId: string) =>
      authedClient().mutation(api.receptions.assignTester, { id, testerId } as never),
    update: (data: Record<string, unknown>) =>
      authedClient().mutation(api.receptions.updateDetails, data as never),
  },

  invoices: {
    list: () => authedClient().query(api.invoices.list, {}),
    create: (data: Record<string, unknown>) =>
      authedClient().mutation(api.invoices.upsert, data as never),
  },

  approvals: {
    process: (data: {
      id: string;
      actionType: "GAPJI" | "EULJI";
      isApproved: boolean;
      rejectionReason?: string;
    }) => authedClient().mutation(api.approvals.process, data as never),
  },

  files: {
    generateDropboxUploadLink: (id: string) =>
      authedClient().action(api.files.generateDropboxUploadLink, { id } as never),
    finalizeDropboxUpload: (id: string, path: string) =>
      authedClient().action(api.files.finalizeDropboxUpload, { id, path } as never),
  },

  email: {
    send: (data: {
      subject: string;
      content: string;
      recipients: string[];
      attachments?: Array<{ filename: string; content: string }>;
    }) => authedClient().action(api.email.send, data as never),
  },
};
