import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "./__mocks__/db";
import { makeRequest, authedRequest, jsonBody } from "./helpers";

import { GET as getLists, POST as addList } from "../../app/api/my-lists/route";
import { DELETE as removeList } from "../../app/api/my-lists/[deckId]/route";
import { PUT as reorderLists } from "../../app/api/my-lists/reorder/route";
import { PUT as updateIcon } from "../../app/api/my-lists/[deckId]/icon/route";

describe("GET /api/my-lists", () => {
  beforeEach(() => {
    prisma.userDeck.findMany.mockReset();
  });

  it("returns user lists", async () => {
    prisma.userDeck.findMany.mockResolvedValue([
      {
        deck: {
          id: "deck-1",
          name: "Anglais",
          ownerId: "user-1",
          cards: [{ id: "c1" }, { id: "c2" }],
          _count: { chapters: 2 },
        },
        icon: "🇬🇧",
      },
    ]);

    const req = authedRequest("http://localhost:3001/api/my-lists");
    const res = await getLists(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.decks).toHaveLength(1);
    expect(data.decks[0].name).toBe("Anglais");
    expect(data.decks[0].cardCount).toBe(2);
    expect(data.decks[0].chapterCount).toBe(2);
    expect(data.decks[0].isOwned).toBe(true);
    expect(data.decks[0].icon).toBe("🇬🇧");
  });

  it("rejects unauthenticated request", async () => {
    const req = makeRequest("http://localhost:3001/api/my-lists");
    const res = await getLists(req);

    expect(res.status).toBe(401);
  });
});

describe("POST /api/my-lists", () => {
  beforeEach(() => {
    prisma.deck.findUnique.mockReset();
    prisma.userDeck.create.mockReset();
  });

  it("adds a list to user collection", async () => {
    prisma.deck.findUnique.mockResolvedValue({ id: "deck-1", name: "Test" });
    prisma.userDeck.create.mockResolvedValue({});

    const req = authedRequest("http://localhost:3001/api/my-lists", {
      method: "POST",
      body: { deckId: "deck-1" },
    });
    const res = await addList(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("returns 404 for non-existent deck", async () => {
    prisma.deck.findUnique.mockResolvedValue(null);

    const req = authedRequest("http://localhost:3001/api/my-lists", {
      method: "POST",
      body: { deckId: "does-not-exist" },
    });
    const res = await addList(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(404);
    expect(data.error).toBe("list not found");
  });

  it("rejects missing deckId (Zod)", async () => {
    const req = authedRequest("http://localhost:3001/api/my-lists", {
      method: "POST",
      body: {},
    });
    const res = await addList(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });
});

describe("DELETE /api/my-lists/:deckId", () => {
  beforeEach(() => {
    prisma.userDeck.deleteMany.mockReset();
  });

  it("removes a list from user collection", async () => {
    prisma.userDeck.deleteMany.mockResolvedValue({ count: 1 });

    const req = authedRequest("http://localhost:3001/api/my-lists/deck-1", {
      method: "DELETE",
    });
    const res = await removeList(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(prisma.userDeck.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", deckId: "deck-1" },
    });
  });
});

describe("PUT /api/my-lists/reorder", () => {
  beforeEach(() => {
    prisma.userDeck.updateMany.mockReset();
  });

  it("reorders user lists", async () => {
    prisma.userDeck.updateMany.mockResolvedValue({ count: 1 });

    const req = authedRequest("http://localhost:3001/api/my-lists/reorder", {
      method: "PUT",
      body: { deckIds: ["deck-2", "deck-1", "deck-3"] },
    });
    const res = await reorderLists(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(prisma.userDeck.updateMany).toHaveBeenCalledTimes(3);
    expect(prisma.userDeck.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", deckId: "deck-2" },
      data: { position: 0 },
    });
    expect(prisma.userDeck.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", deckId: "deck-1" },
      data: { position: 1 },
    });
  });

  it("rejects empty deckIds (Zod)", async () => {
    const req = authedRequest("http://localhost:3001/api/my-lists/reorder", {
      method: "PUT",
      body: { deckIds: [] },
    });
    const res = await reorderLists(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });
});

describe("PUT /api/my-lists/:deckId/icon", () => {
  beforeEach(() => {
    prisma.userDeck.updateMany.mockReset();
  });

  it("updates deck icon", async () => {
    prisma.userDeck.updateMany.mockResolvedValue({ count: 1 });

    const req = authedRequest("http://localhost:3001/api/my-lists/deck-1/icon", {
      method: "PUT",
      body: { icon: "🎯" },
    });
    const res = await updateIcon(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("rejects empty icon (Zod)", async () => {
    const req = authedRequest("http://localhost:3001/api/my-lists/deck-1/icon", {
      method: "PUT",
      body: { icon: "" },
    });
    const res = await updateIcon(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });
});
