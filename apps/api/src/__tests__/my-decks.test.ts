import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "./__mocks__/db";
import { authedRequest, jsonBody } from "./helpers";

import { POST as createDeck } from "../../app/api/my-decks/route";
import { PUT as updateDeck, DELETE as deleteDeck } from "../../app/api/my-decks/[deckId]/route";
import { POST as createCard } from "../../app/api/my-decks/[deckId]/cards/route";
import { PUT as updateCard, DELETE as deleteCard } from "../../app/api/my-decks/[deckId]/cards/[cardId]/route";

describe("POST /api/my-decks", () => {
  beforeEach(() => {
    prisma.deck.create.mockReset();
  });

  it("creates a new deck with cards", async () => {
    prisma.deck.create.mockResolvedValue({
      id: "deck-new",
      name: "New Deck",
      cards: [{ id: "card-1" }, { id: "card-2" }],
    });

    const req = authedRequest("http://localhost:3001/api/my-decks", {
      method: "POST",
      body: {
        name: "New Deck",
        cards: [
          { question: "Q1", answers: ["A1"] },
          { question: "Q2", answers: ["A2", "A2b"] },
        ],
      },
    });
    const res = await createDeck(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.deck.name).toBe("New Deck");
    expect(data.deck.cardCount).toBe(2);
  });

  it("rejects deck without name (Zod)", async () => {
    const req = authedRequest("http://localhost:3001/api/my-decks", {
      method: "POST",
      body: { cards: [{ question: "Q", answers: ["A"] }] },
    });
    const res = await createDeck(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });

  it("rejects deck without cards (Zod)", async () => {
    const req = authedRequest("http://localhost:3001/api/my-decks", {
      method: "POST",
      body: { name: "Test", cards: [] },
    });
    const res = await createDeck(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });

  it("rejects card without answers (Zod)", async () => {
    const req = authedRequest("http://localhost:3001/api/my-decks", {
      method: "POST",
      body: { name: "Test", cards: [{ question: "Q", answers: [] }] },
    });
    const res = await createDeck(req);
    const data = await jsonBody(res);

    expect(res.status).toBe(400);
    expect(data.error).toContain("validation error");
  });
});

describe("PUT /api/my-decks/:deckId", () => {
  beforeEach(() => {
    prisma.deck.findUnique.mockReset();
    prisma.deck.update.mockReset();
  });

  it("updates deck name", async () => {
    prisma.deck.findUnique.mockResolvedValue({ ownerId: "user-1" });
    prisma.deck.update.mockResolvedValue({});

    const req = authedRequest("http://localhost:3001/api/my-decks/deck-1", {
      method: "PUT",
      body: { name: "Updated Name" },
    });
    const res = await updateDeck(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("rejects non-owner", async () => {
    prisma.deck.findUnique.mockResolvedValue({ ownerId: "other-user" });

    const req = authedRequest("http://localhost:3001/api/my-decks/deck-1", {
      method: "PUT",
      body: { name: "Updated" },
    });
    const res = await updateDeck(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(403);
    expect(data.error).toBe("unauthorized");
  });

  it("returns 404 for unknown deck", async () => {
    prisma.deck.findUnique.mockResolvedValue(null);

    const req = authedRequest("http://localhost:3001/api/my-decks/unknown", {
      method: "PUT",
      body: { name: "Test" },
    });
    const res = await updateDeck(req, { params: { deckId: "unknown" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(404);
    expect(data.error).toBe("deck not found");
  });
});

describe("DELETE /api/my-decks/:deckId", () => {
  beforeEach(() => {
    prisma.deck.findUnique.mockReset();
    prisma.deck.delete.mockReset();
  });

  it("deletes owned deck", async () => {
    prisma.deck.findUnique.mockResolvedValue({ ownerId: "user-1" });
    prisma.deck.delete.mockResolvedValue({});

    const req = authedRequest("http://localhost:3001/api/my-decks/deck-1", {
      method: "DELETE",
    });
    const res = await deleteDeck(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("rejects delete by non-owner", async () => {
    prisma.deck.findUnique.mockResolvedValue({ ownerId: "other-user" });

    const req = authedRequest("http://localhost:3001/api/my-decks/deck-1", {
      method: "DELETE",
    });
    const res = await deleteDeck(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(403);
    expect(data.error).toContain("unauthorized");
  });
});

describe("POST /api/my-decks/:deckId/cards", () => {
  beforeEach(() => {
    prisma.deck.findUnique.mockReset();
    prisma.card.create.mockReset();
  });

  it("creates a card in owned deck", async () => {
    prisma.deck.findUnique.mockResolvedValue({ ownerId: "user-1" });
    prisma.card.create.mockResolvedValue({
      id: "card-new",
      question: "What is 2+2?",
      answers: ["4"],
      imageUrl: null,
    });

    const req = authedRequest("http://localhost:3001/api/my-decks/deck-1/cards", {
      method: "POST",
      body: { question: "What is 2+2?", answers: ["4"] },
    });
    const res = await createCard(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.card.question).toBe("What is 2+2?");
  });

  it("rejects card creation by non-owner", async () => {
    prisma.deck.findUnique.mockResolvedValue({ ownerId: "other-user" });

    const req = authedRequest("http://localhost:3001/api/my-decks/deck-1/cards", {
      method: "POST",
      body: { question: "Q", answers: ["A"] },
    });
    const res = await createCard(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(403);
  });
});

describe("PUT /api/my-decks/:deckId/cards/:cardId", () => {
  beforeEach(() => {
    prisma.deck.findUnique.mockReset();
    prisma.card.update.mockReset();
  });

  it("updates a card", async () => {
    prisma.deck.findUnique.mockResolvedValue({ ownerId: "user-1" });
    prisma.card.update.mockResolvedValue({
      id: "card-1",
      question: "Updated Q",
      answers: ["Updated A"],
      imageUrl: null,
    });

    const req = authedRequest("http://localhost:3001/api/my-decks/deck-1/cards/card-1", {
      method: "PUT",
      body: { question: "Updated Q", answers: ["Updated A"] },
    });
    const res = await updateCard(req, { params: { deckId: "deck-1", cardId: "card-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.card.question).toBe("Updated Q");
  });
});

describe("DELETE /api/my-decks/:deckId/cards/:cardId", () => {
  beforeEach(() => {
    prisma.deck.findUnique.mockReset();
    prisma.card.delete.mockReset();
  });

  it("deletes a card from owned deck", async () => {
    prisma.deck.findUnique.mockResolvedValue({ ownerId: "user-1" });
    prisma.card.delete.mockResolvedValue({});

    const req = authedRequest("http://localhost:3001/api/my-decks/deck-1/cards/card-1", {
      method: "DELETE",
    });
    const res = await deleteCard(req, { params: { deckId: "deck-1", cardId: "card-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
  });
});
