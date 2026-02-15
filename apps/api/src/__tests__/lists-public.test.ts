import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "./__mocks__/db";
import { authedRequest, jsonBody } from "./helpers";

import { GET as getCards } from "../../app/api/lists/[deckId]/cards/route";

describe("GET /api/lists/:deckId/cards", () => {
  beforeEach(() => {
    prisma.card.findMany.mockReset();
  });

  it("returns cards for a deck", async () => {
    prisma.card.findMany.mockResolvedValue([
      {
        id: "c1",
        question: "Hello",
        answers: ["Bonjour"],
        distractors: ["Au revoir", "Merci"],
        audioUrlEn: "/audio/hello.mp3",
        audioUrlFr: "/audio/bonjour.mp3",
        imageUrl: null,
        chapterId: null,
      },
      {
        id: "c2",
        question: "Goodbye",
        answers: ["Au revoir"],
        distractors: [],
        audioUrlEn: null,
        audioUrlFr: null,
        imageUrl: "/img/bye.png",
        chapterId: "ch-1",
      },
    ]);

    const req = authedRequest("http://localhost:3001/api/lists/deck-1/cards");
    const res = await getCards(req, { params: { deckId: "deck-1" } });
    const data = await jsonBody(res);

    expect(res.status).toBe(200);
    expect(data.cards).toHaveLength(2);
    expect(data.cards[0].question).toBe("Hello");
    expect(data.cards[0].answers).toEqual(["Bonjour"]);
    expect(data.cards[0].distractors).toEqual(["Au revoir", "Merci"]);
    expect(data.cards[1].imageUrl).toBe("/img/bye.png");
  });
});
