import { vi } from "vitest";

// Set test environment variables before any imports
process.env.JWT_SECRET = "test-secret-key-for-vitest";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.NODE_ENV = "test";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async (pw: string) => `hashed:${pw}`),
    compare: vi.fn(async (pw: string, hash: string) => hash === `hashed:${pw}`),
  },
  hash: vi.fn(async (pw: string) => `hashed:${pw}`),
  compare: vi.fn(async (pw: string, hash: string) => hash === `hashed:${pw}`),
}));

// Mock openai
vi.mock("openai", () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: vi.fn(async () => ({
            choices: [{ message: { content: "OUI" } }],
          })),
        },
      };
    },
  };
});
