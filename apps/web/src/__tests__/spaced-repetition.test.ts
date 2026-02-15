import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { defaultCardState, gradeCard, type CardState } from "../lib/sr-engine";
import { debugNow, debugDate } from "../lib/debug-date";
import { isCorrect } from "../lib/text";
import { idbGet, idbSet } from "../lib/idb";
import type { CardFromApi } from "../lib/api";

/**
 * Simule une session d'étude complète avec 2 cartes sur plusieurs jours.
 * Vérifie :
 *  - les cartes sont présentées seulement quand nextReviewAt <= now
 *  - les intervalles grandissent après chaque bonne réponse
 *  - une mauvaise réponse remet l'intervalle à 1 jour
 */

function setDebugDate(dateStr: string) {
  localStorage.setItem("debug_date", dateStr);
}
function clearDebugDate() {
  localStorage.removeItem("debug_date");
}

function isDue(card: CardState): boolean {
  return card.nextReviewAt <= debugNow();
}

function dayStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// ——— Fonctions identiques à StudyView.tsx ———
// Reproduites ici pour tester le VRAI flux, pas une abstraction

type StudyState = {
  cards: Record<string, CardState>;
  doneToday: number;
  lastActiveDay: string;
};

function todayKey() {
  return debugDate().toISOString().slice(0, 10);
}

function stateKey(deckId: string) {
  return `state:${deckId}`;
}

function buildStudyState(cards: CardFromApi[]): StudyState {
  const now = debugNow();
  const map: Record<string, CardState> = {};
  for (const c of cards) map[c.id] = defaultCardState(now);
  return { cards: map, doneToday: 0, lastActiveDay: todayKey() };
}

function pickNextDue(cards: CardFromApi[], state: StudyState) {
  const now = debugNow();
  const due = cards
    .map(c => ({ ...c, cs: state.cards[c.id] ?? defaultCardState(now) }))
    .filter(x => x.cs.nextReviewAt <= now);
  if (due.length === 0) return null;
  return due[0]; // Déterministe pour les tests (pas random)
}

function bumpDailyCounters(s: StudyState): StudyState {
  const t = todayKey();
  return s.lastActiveDay !== t ? { ...s, doneToday: 0, lastActiveDay: t } : s;
}

/** Simule onValidate() de StudyView — identique au code réel */
async function simulateAnswer(
  deckId: string,
  cards: CardFromApi[],
  study: StudyState,
  userAnswer: string,
): Promise<{ study: StudyState; ok: boolean; cardId: string } | null> {
  const current = pickNextDue(cards, study);
  if (!current) return null;

  const ok = isCorrect(userAnswer, current.answers);
  const next0 = bumpDailyCounters(study);
  const next: StudyState = {
    ...next0,
    doneToday: next0.doneToday + 1,
    cards: {
      ...next0.cards,
      [current.id]: gradeCard(next0.cards[current.id] ?? defaultCardState(), ok),
    },
  };

  await idbSet(stateKey(deckId), next);
  return { study: next, ok, cardId: current.id };
}

describe("Spaced Repetition - simulation multi-jours", () => {
  beforeEach(() => clearDebugDate());
  afterEach(() => clearDebugDate());

  it("intervalles croissants après réponses correctes successives", () => {
    // Jour 0 : 2026-03-01 — initialisation
    setDebugDate("2026-03-01");
    const now0 = debugNow();
    let cardA = defaultCardState(now0);
    let cardB = defaultCardState(now0);

    // Les 2 cartes sont dues immédiatement
    expect(isDue(cardA)).toBe(true);
    expect(isDue(cardB)).toBe(true);

    // Répondre correctement aux 2
    cardA = gradeCard(cardA, true, now0);
    cardB = gradeCard(cardB, true, now0);

    // Après 1ère bonne réponse : intervalle = 1 jour
    expect(cardA.intervalDays).toBe(1);
    expect(cardA.reps).toBe(1);
    expect(dayStr(cardA.nextReviewAt)).toBe("2026-03-02");

    expect(cardB.intervalDays).toBe(1);
    expect(dayStr(cardB.nextReviewAt)).toBe("2026-03-02");

    // --- Jour 1 : 2026-03-02 ---
    setDebugDate("2026-03-02");
    expect(isDue(cardA)).toBe(true);
    expect(isDue(cardB)).toBe(true);

    cardA = gradeCard(cardA, true, debugNow());
    cardB = gradeCard(cardB, true, debugNow());

    // Après 2ème bonne réponse : intervalle = 3 jours
    expect(cardA.intervalDays).toBe(3);
    expect(cardA.reps).toBe(2);
    expect(dayStr(cardA.nextReviewAt)).toBe("2026-03-05");

    expect(cardB.intervalDays).toBe(3);
    expect(dayStr(cardB.nextReviewAt)).toBe("2026-03-05");

    // --- Jour 2 : 2026-03-03 (entre-deux) ---
    setDebugDate("2026-03-03");
    // Aucune carte n'est due (prochaine révision le 5)
    expect(isDue(cardA)).toBe(false);
    expect(isDue(cardB)).toBe(false);

    // --- Jour 5 : 2026-03-05 ---
    setDebugDate("2026-03-05");
    expect(isDue(cardA)).toBe(true);
    expect(isDue(cardB)).toBe(true);

    cardA = gradeCard(cardA, true, debugNow());
    cardB = gradeCard(cardB, true, debugNow());

    // 3ème bonne réponse : intervalle = round(3 * ease)
    // ease après 3 succès = 2.0 + 0.10*3 = 2.30
    // intervalle = round(3 * 2.30) = round(6.9) = 7
    expect(cardA.intervalDays).toBe(7);
    expect(cardA.reps).toBe(3);
    expect(dayStr(cardA.nextReviewAt)).toBe("2026-03-12");

    expect(cardB.intervalDays).toBe(7);
    expect(dayStr(cardB.nextReviewAt)).toBe("2026-03-12");

    // --- Jour 12 : 2026-03-12 ---
    setDebugDate("2026-03-12");
    expect(isDue(cardA)).toBe(true);

    cardA = gradeCard(cardA, true, debugNow());

    // 4ème bonne réponse : ease = 2.40, intervalle = round(7 * 2.40) = 17
    expect(cardA.intervalDays).toBe(17);
    expect(cardA.reps).toBe(4);
    expect(dayStr(cardA.nextReviewAt)).toBe("2026-03-29");

    // Résumé des intervalles : 1 → 3 → 7 → 17 (croissant ✓)
  });

  it("mauvaise réponse remet l'intervalle à 1 jour", () => {
    setDebugDate("2026-04-01");
    let card = defaultCardState(debugNow());

    // 2 bonnes réponses d'abord
    card = gradeCard(card, true, debugNow());
    expect(card.intervalDays).toBe(1); // J+1

    setDebugDate("2026-04-02");
    card = gradeCard(card, true, debugNow());
    expect(card.intervalDays).toBe(3); // J+3
    expect(dayStr(card.nextReviewAt)).toBe("2026-04-05");

    // Le 5 avril : mauvaise réponse
    setDebugDate("2026-04-05");
    expect(isDue(card)).toBe(true);
    card = gradeCard(card, false, debugNow());

    // Reset : intervalle = 1, reps = 0
    expect(card.intervalDays).toBe(1);
    expect(card.reps).toBe(0);
    expect(card.failureCount).toBe(1);
    expect(dayStr(card.nextReviewAt)).toBe("2026-04-06");

    // Le 6 avril : bonne réponse, repart de reps=1
    setDebugDate("2026-04-06");
    expect(isDue(card)).toBe(true);
    card = gradeCard(card, true, debugNow());
    expect(card.intervalDays).toBe(1);
    expect(card.reps).toBe(1);
    expect(dayStr(card.nextReviewAt)).toBe("2026-04-07");
  });

  it("carte non due n'est pas présentée avant sa date", () => {
    setDebugDate("2026-05-01");
    let card = defaultCardState(debugNow());
    card = gradeCard(card, true, debugNow()); // next: 2026-05-02

    // Toujours le même jour : pas encore due
    expect(isDue(card)).toBe(false);

    // Le lendemain : due
    setDebugDate("2026-05-02");
    expect(isDue(card)).toBe(true);
  });

  it("2 cartes avec parcours différents (1 bonne, 1 mauvaise)", () => {
    setDebugDate("2026-06-01");
    const now = debugNow();
    let cardOk = defaultCardState(now);
    let cardKo = defaultCardState(now);

    // Jour 1 : les 2 sont dues, A réussit, B échoue
    cardOk = gradeCard(cardOk, true, now);
    cardKo = gradeCard(cardKo, false, now);

    expect(cardOk.intervalDays).toBe(1);
    expect(dayStr(cardOk.nextReviewAt)).toBe("2026-06-02");

    expect(cardKo.intervalDays).toBe(1);
    expect(dayStr(cardKo.nextReviewAt)).toBe("2026-06-02");

    // Jour 2
    setDebugDate("2026-06-02");
    cardOk = gradeCard(cardOk, true, debugNow());
    cardKo = gradeCard(cardKo, true, debugNow());

    // cardOk: reps=2 → intervalle 3j
    expect(cardOk.intervalDays).toBe(3);
    expect(dayStr(cardOk.nextReviewAt)).toBe("2026-06-05");

    // cardKo: reps=1 (repartie de 0 après échec) → intervalle 1j
    expect(cardKo.intervalDays).toBe(1);
    expect(dayStr(cardKo.nextReviewAt)).toBe("2026-06-03");

    // Jour 3 : seule cardKo est due
    setDebugDate("2026-06-03");
    expect(isDue(cardOk)).toBe(false);
    expect(isDue(cardKo)).toBe(true);
  });

  it("ease ne dépasse pas les bornes [1.3, 2.5]", () => {
    setDebugDate("2026-07-01");
    let card = defaultCardState(debugNow()); // ease = 2.0

    // 5 bonnes réponses : ease += 0.10 chaque fois
    // 2.0 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5 (capped)
    for (let i = 0; i < 6; i++) {
      card = gradeCard(card, true, debugNow());
      setDebugDate(`2026-08-${String(i + 2).padStart(2, "0")}`);
    }
    expect(card.ease).toBe(2.5);

    // Plusieurs échecs : ease -= 0.20 chaque fois
    // 2.5 → 2.3 → 2.1 → 1.9 → 1.7 → 1.5 → 1.3 (capped)
    for (let i = 0; i < 7; i++) {
      card = gradeCard(card, false, debugNow());
    }
    expect(card.ease).toBe(1.3);
  });

  it("simulation complète sur 1 mois — 2 cartes, parcours réaliste", () => {
    // Carte A : élève assidu, toujours juste
    // Carte B : élève moyen, se trompe parfois
    setDebugDate("2026-03-01");
    let a = defaultCardState(debugNow());
    let b = defaultCardState(debugNow());

    // Journal de bord : on avance jour par jour sur 31 jours
    type LogEntry = { day: number; date: string; aDue: boolean; bDue: boolean; aInterval?: number; bInterval?: number };
    const log: LogEntry[] = [];

    // Scénario carte B : se trompe aux jours 5 et 20
    const bFailDays = new Set([5, 20]);

    const startMs = new Date("2026-03-01").getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    for (let day = 0; day <= 30; day++) {
      const dateStr = new Date(startMs + day * oneDay).toISOString().slice(0, 10);
      setDebugDate(dateStr);
      const now = debugNow();

      const aDue = isDue(a);
      const bDue = isDue(b);
      const entry: LogEntry = { day, date: dateStr, aDue, bDue };

      if (aDue) {
        a = gradeCard(a, true, now); // A toujours juste
        entry.aInterval = a.intervalDays;
      }
      if (bDue) {
        const ok = !bFailDays.has(day);
        b = gradeCard(b, ok, now);
        entry.bInterval = b.intervalDays;
      }

      log.push(entry);
    }

    // --- Vérifications carte A (toujours juste) ---

    // Les intervalles de A doivent être strictement croissants
    const aIntervals = log.filter(e => e.aInterval != null).map(e => e.aInterval!);
    // Séquence attendue : 1, 3, 7, 17, 43
    // J0→J1(+1), J1→J4(+3), J4→J11(+7), J11→J28(+17), J28→J71(+43)
    expect(aIntervals).toEqual([1, 3, 7, 17, 43]);

    // Vérifier les jours où A est due
    const aDueDays = log.filter(e => e.aDue).map(e => e.day);
    expect(aDueDays).toEqual([0, 1, 4, 11, 28]);

    // Chaque intervalle est strictement plus grand que le précédent
    for (let i = 1; i < aIntervals.length; i++) {
      expect(aIntervals[i]).toBeGreaterThan(aIntervals[i - 1]);
    }

    // A doit avoir 5 reps, 0 échecs
    expect(a.reps).toBe(5);
    expect(a.successCount).toBe(5);
    expect(a.failureCount).toBe(0);

    // Dernière révision de A : prochain intervalle très long
    // ease = 2.0 + 5*0.10 = 2.50 (capped)
    expect(a.ease).toBe(2.5);

    // --- Vérifications carte B (2 échecs) ---

    // B a des échecs donc ses intervalles sont plus courts et se réinitialisent
    // On vérifie que B n'est PAS due au jour 5 (elle est en attente jusqu'au J11)
    expect(log[5].bDue).toBe(false);

    // B est due au jour 11
    expect(log[11].bDue).toBe(true);

    // Au jour 20, B pourrait ne pas être due non plus (si interval a sauté par dessus)
    // Vérifions au moins que B a eu des reviews
    expect(b.successCount + b.failureCount).toBeGreaterThanOrEqual(4);

    // --- Vérification globale : A avance plus vite que B ---
    // A a des intervalles plus longs que B à la fin du mois
    expect(a.intervalDays).toBeGreaterThanOrEqual(b.intervalDays);

    // --- Vérification qu'il y a des jours "vides" (aucune carte due) ---
    const emptyDays = log.filter(e => !e.aDue && !e.bDue);
    expect(emptyDays.length).toBeGreaterThan(0);

    // --- Affichage du journal pour debug (visible avec --reporter=verbose) ---
    const summary = log
      .filter(e => e.aDue || e.bDue)
      .map(e => {
        const parts = [`J${String(e.day).padStart(2, " ")} ${e.date}`];
        if (e.aDue) parts.push(`A: due → interval=${e.aInterval}j`);
        if (e.bDue) parts.push(`B: due → interval=${e.bInterval}j`);
        return parts.join("  |  ");
      });

    // Vérifier qu'on a bien des événements
    expect(summary.length).toBeGreaterThanOrEqual(5);
  });

  it("simulation 1 mois — intervalles de A jamais décroissants", () => {
    setDebugDate("2026-03-01");
    let card = defaultCardState(debugNow());

    const startMs = new Date("2026-03-01").getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const intervals: number[] = [];

    for (let day = 0; day <= 30; day++) {
      const dateStr = new Date(startMs + day * oneDay).toISOString().slice(0, 10);
      setDebugDate(dateStr);
      if (isDue(card)) {
        card = gradeCard(card, true, debugNow());
        intervals.push(card.intervalDays);
      }
    }

    // Avec que des bonnes réponses, chaque intervalle >= le précédent
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }

    // La carte devrait avoir été revue au moins 4 fois dans le mois
    expect(intervals.length).toBeGreaterThanOrEqual(4);

    // Le dernier intervalle devrait être > 7 jours (espacement significatif)
    expect(intervals[intervals.length - 1]).toBeGreaterThan(7);
  });

  it("simulation 1 mois — échecs réguliers empêchent la progression", () => {
    setDebugDate("2026-03-01");
    let card = defaultCardState(debugNow());

    const startMs = new Date("2026-03-01").getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    let reviewCount = 0;

    // Alternance : OK, OK, FAIL, OK, OK, FAIL...
    let streak = 0;
    for (let day = 0; day <= 30; day++) {
      const dateStr = new Date(startMs + day * oneDay).toISOString().slice(0, 10);
      setDebugDate(dateStr);
      if (isDue(card)) {
        streak++;
        const ok = streak % 3 !== 0; // échec toutes les 3 reviews
        card = gradeCard(card, ok, debugNow());
        reviewCount++;
      }
    }

    // Beaucoup plus de reviews qu'un élève parfait (car reset fréquent)
    expect(reviewCount).toBeGreaterThan(8);

    // L'intervalle reste petit (jamais > 7j car reset régulier)
    expect(card.intervalDays).toBeLessThanOrEqual(7);

    // Avec alternance OK,OK,FAIL : ease oscille (+0.1,+0.1,-0.2 = net 0)
    // Ne progresse jamais loin au-delà de 2.0
    expect(card.ease).toBeLessThanOrEqual(2.2);
  });
});

// ============================================================
// TEST D'INTÉGRATION — flux réel StudyView sur 1 mois
// Utilise : vraies cartes, isCorrect(), IDB, pickNextDue()
// ============================================================

describe("Intégration — flux StudyView réel sur 1 mois", () => {
  afterEach(() => clearDebugDate());

  // Vraies cartes comme dans l'API
  const DECK_ID = "deck-test-123";
  const CARDS: CardFromApi[] = [
    {
      id: "card-1",
      question: "What is the capital of France?",
      answers: ["Paris"],
      distractors: [],
      audioUrlEn: null,
      audioUrlFr: null,
      imageUrl: null,
    },
    {
      id: "card-2",
      question: "How do you say 'cat' in French?",
      answers: ["chat", "un chat", "le chat"],
      distractors: [],
      audioUrlEn: null,
      audioUrlFr: null,
      imageUrl: null,
    },
  ];

  it("flux complet : init IDB, réponses textuelles, persistance, dates croissantes", async () => {
    // === JOUR 1 : 2026-03-01 — Premier lancement ===
    setDebugDate("2026-03-01");

    // Charger state depuis IDB (vide au début, comme dans StudyView useEffect)
    let study = await idbGet<StudyState>(stateKey(DECK_ID));
    expect(study).toBeNull(); // Première fois

    // Initialiser (comme buildStudyState dans StudyView)
    study = buildStudyState(CARDS);
    await idbSet(stateKey(DECK_ID), study);

    // Vérifier : 2 cartes dues immédiatement
    expect(pickNextDue(CARDS, study)).not.toBeNull();

    // Répondre "Paris" à la question sur la France — bonne réponse
    let res = await simulateAnswer(DECK_ID, CARDS, study, "Paris");
    expect(res).not.toBeNull();
    expect(res!.ok).toBe(true);
    expect(res!.cardId).toBe("card-1"); // Déterministe (premier due)
    study = res!.study;

    // Vérifier IDB persisté
    const persisted = await idbGet<StudyState>(stateKey(DECK_ID));
    expect(persisted).not.toBeNull();
    expect(persisted!.cards["card-1"].successCount).toBe(1);
    expect(persisted!.doneToday).toBe(1);

    // Répondre "le chat" à la question chat — bonne réponse (variante acceptée)
    res = await simulateAnswer(DECK_ID, CARDS, study, "le chat");
    expect(res!.ok).toBe(true);
    expect(res!.cardId).toBe("card-2");
    study = res!.study;

    expect(study.doneToday).toBe(2);

    // Plus aucune carte due aujourd'hui
    expect(pickNextDue(CARDS, study)).toBeNull();

    // Les 2 cartes ont next = 2026-03-02
    expect(dayStr(study.cards["card-1"].nextReviewAt)).toBe("2026-03-02");
    expect(dayStr(study.cards["card-2"].nextReviewAt)).toBe("2026-03-02");

    // === JOUR 2 : 2026-03-02 ===
    setDebugDate("2026-03-02");

    // Recharger depuis IDB (comme ferait un refresh de page)
    study = (await idbGet<StudyState>(stateKey(DECK_ID)))!;
    expect(pickNextDue(CARDS, study)).not.toBeNull();

    // Bonne réponse carte 1
    res = await simulateAnswer(DECK_ID, CARDS, study, "paris"); // minuscule, isCorrect normalise
    expect(res!.ok).toBe(true);
    study = res!.study;

    // Mauvaise réponse carte 2 : "chien" au lieu de "chat"
    res = await simulateAnswer(DECK_ID, CARDS, study, "chien");
    expect(res!.ok).toBe(false);
    expect(res!.cardId).toBe("card-2");
    study = res!.study;

    // Carte 1 : intervalle 3j → next = 03-05
    expect(study.cards["card-1"].intervalDays).toBe(3);
    expect(dayStr(study.cards["card-1"].nextReviewAt)).toBe("2026-03-05");

    // Carte 2 : échec → reset intervalle 1j → next = 03-03
    expect(study.cards["card-2"].intervalDays).toBe(1);
    expect(study.cards["card-2"].reps).toBe(0);
    expect(dayStr(study.cards["card-2"].nextReviewAt)).toBe("2026-03-03");

    // doneToday reset à 0 (nouveau jour) puis +2
    expect(study.doneToday).toBe(2);
    expect(study.lastActiveDay).toBe("2026-03-02");

    // === JOUR 3 : 2026-03-03 — Seule carte 2 est due ===
    setDebugDate("2026-03-03");
    study = (await idbGet<StudyState>(stateKey(DECK_ID)))!;

    let due = pickNextDue(CARDS, study);
    expect(due).not.toBeNull();
    expect(due!.id).toBe("card-2"); // Seule carte 2 est due

    res = await simulateAnswer(DECK_ID, CARDS, study, "un chat"); // variante acceptée
    expect(res!.ok).toBe(true);
    study = res!.study;

    // Plus de cartes dues (carte 1 pas avant le 05)
    expect(pickNextDue(CARDS, study)).toBeNull();

    // === JOUR 4 : 2026-03-04 — Carte 2 due (reps=1 après échec, interval=1j) ===
    setDebugDate("2026-03-04");
    study = (await idbGet<StudyState>(stateKey(DECK_ID)))!;

    due = pickNextDue(CARDS, study);
    expect(due).not.toBeNull();
    expect(due!.id).toBe("card-2"); // Carte 2 rattrape son retard

    res = await simulateAnswer(DECK_ID, CARDS, study, "chat");
    expect(res!.ok).toBe(true);
    study = res!.study;

    // Carte 2 : reps=2 → interval=3j → next = 03-07
    expect(study.cards["card-2"].intervalDays).toBe(3);
    expect(dayStr(study.cards["card-2"].nextReviewAt)).toBe("2026-03-07");

    // Plus rien (carte 1 pas avant le 05)
    expect(pickNextDue(CARDS, study)).toBeNull();

    // === SIMULATION JOURS 5-31 : boucle automatique ===
    const startMs = new Date("2026-03-05").getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const reviewLog: { day: string; cardId: string; ok: boolean; interval: number }[] = [];

    for (let d = 0; d <= 26; d++) { // 03-05 à 03-31
      const dateStr = new Date(startMs + d * oneDay).toISOString().slice(0, 10);
      setDebugDate(dateStr);

      // Recharger depuis IDB à chaque "jour" (comme un utilisateur qui ouvre l'app)
      study = (await idbGet<StudyState>(stateKey(DECK_ID)))!;

      // Répondre à toutes les cartes dues ce jour
      let next = pickNextDue(CARDS, study);
      while (next) {
        // Réponse correcte pour toutes les cartes restantes
        const answer = next.answers[0]; // Donner la bonne réponse
        res = await simulateAnswer(DECK_ID, CARDS, study, answer);
        expect(res!.ok).toBe(true);
        study = res!.study;

        reviewLog.push({
          day: dateStr,
          cardId: res!.cardId,
          ok: true,
          interval: study.cards[res!.cardId].intervalDays,
        });

        next = pickNextDue(CARDS, study);
      }
    }

    // === VÉRIFICATIONS FINALES ===

    // Recharger depuis IDB une dernière fois
    const finalState = (await idbGet<StudyState>(stateKey(DECK_ID)))!;

    // Les 2 cartes ont été étudiées plusieurs fois
    expect(finalState.cards["card-1"].successCount).toBeGreaterThanOrEqual(4);
    expect(finalState.cards["card-2"].successCount).toBeGreaterThanOrEqual(4);

    // Carte 2 a 1 échec (jour 2)
    expect(finalState.cards["card-2"].failureCount).toBe(1);
    expect(finalState.cards["card-1"].failureCount).toBe(0);

    // Les intervalles finaux sont significativement espacés (> 7 jours)
    expect(finalState.cards["card-1"].intervalDays).toBeGreaterThan(7);

    // Carte 1 (jamais d'échec) a un intervalle >= carte 2 (1 échec au début)
    expect(finalState.cards["card-1"].intervalDays).toBeGreaterThanOrEqual(
      finalState.cards["card-2"].intervalDays
    );

    // Les intervalles de carte 1 dans le log sont strictement croissants
    const card1Intervals = reviewLog
      .filter(e => e.cardId === "card-1")
      .map(e => e.interval);
    for (let i = 1; i < card1Intervals.length; i++) {
      expect(card1Intervals[i]).toBeGreaterThan(card1Intervals[i - 1]);
    }

    // Il y a eu des jours sans aucune review (l'espacement fonctionne)
    const daysWithReviews = new Set(reviewLog.map(e => e.day));
    const totalDays = 27; // 03-05 à 03-31
    expect(daysWithReviews.size).toBeLessThan(totalDays);

    // Vérification isCorrect : "PARIS" (majuscule), "le chat" (variante) ont bien marché
    // Prouvé par les successCount ci-dessus
  });
});
