"use client";

import { useEffect, useMemo, useState } from "react";
import { DECK } from "../lib/deck";
import { idbGet, idbSet } from "../lib/idb";
import { defaultCardState, gradeCard, type CardState } from "../lib/sr-engine";
import { isCorrect } from "../lib/text";
import { queueReview } from "../lib/sync";


type AppState = {
  cards: Record<string, CardState>;
  doneToday: number;
  lastActiveDay: string;
};

const STORAGE_KEY = "state";

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function buildInitialState(): AppState {
  const now = Date.now();
  const cards: Record<string, CardState> = {};
  for (const c of DECK) cards[c.id] = defaultCardState(now);
  return { cards, doneToday: 0, lastActiveDay: todayKey() };
}

function pickNextDue(state: AppState) {
  const now = Date.now();

  const due = DECK
    .map(c => ({
      ...c,
      cs: state.cards[c.id] ?? defaultCardState(now),
    }))
    .filter(x => x.cs.nextReviewAt <= now)
    .sort((a, b) => a.cs.nextReviewAt - b.cs.nextReviewAt);

  return due[0] ?? null;
}


export default function HomePage() {
  const [app, setApp] = useState<AppState | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ ok: boolean; expected: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
console.log("RENDER HomePage", app);
  useEffect(() => {
    idbGet<AppState>(STORAGE_KEY).then(s => setApp(s ?? buildInitialState()));
  }, []);

  const current = useMemo(() => (app ? pickNextDue(app) : null), [app]);


  useEffect(() => {
    if (!showResult) {
      setAnswer("");
      setResult(null);
    }
  }, [current?.id, showResult]);

  function bumpDailyCounters(s: AppState) {
    const t = todayKey();
    return s.lastActiveDay !== t ? { ...s, doneToday: 0, lastActiveDay: t } : s;
  }

  async function onValidate() {
    if (!app || !current || showResult) return;

    const ok = isCorrect(answer, current.expectedAnswers);
    const next0 = bumpDailyCounters(app);

    const next = {
      ...next0,
      doneToday: next0.doneToday + 1,
      cards: {
        ...next0.cards,
        [current.id]: gradeCard(next0.cards[current.id], ok),
      },
    };

    setResult({ ok, expected: current.expectedAnswers[0] ?? "" });
    setShowResult(true);
    await idbSet(STORAGE_KEY, next);

    // Sync: envoyer la review au serveur (non-bloquant)
    queueReview({
      cardId: current.id,
      ok,
      userAnswer: answer,
    });
  }

  async function goNext() {
    setShowResult(false);
    setApp(await idbGet<AppState>(STORAGE_KEY));
  }

  if (!app) {
    return (
      <div className="app">
        <div className="container">
          <div className="card">Chargement…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <h2>Memoo</h2>
          <span className="small">Aujourd’hui : <b>{app.doneToday}</b></span>
        </div>

        <div className="card">
          {!current ? (
            <>
              <span className="badge ok">🎉 Terminé</span>
              <p className="small">Aucune carte due pour le moment.</p>
            </>
          ) : (
            <>
              <div className="small">Question</div>
              <h3>{current.question}</h3>

              {!showResult && (
                <>
                  <div className="input-wrapper">
                    <input
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Tape ta réponse…"
                      onKeyDown={e => e.key === "Enter" && onValidate()}
                    />
                  </div>

                  <div className="actions">
                    <button className="primary" onClick={onValidate}>Valider</button>
                    <button
                      onClick={() => {
                        setResult({
                          ok: false,
                          expected: current.expectedAnswers[0] ?? "",
                        });
                        setShowResult(true);
                      }}
                    >
                      Voir la réponse
                    </button>
                  </div>
                </>
              )}

              {showResult && result && (
                <>
                  <span className={`badge ${result.ok ? "ok" : "bad"}`}>
                    {result.ok ? "✅ Correct" : "❌ Incorrect"}
                  </span>

                  <div className="small">
                    Référence : <b>{result.expected}</b>
                  </div>

                  <button className="primary" onClick={goNext}>
                    Suivant
                  </button>
                </>
              )}
            </>
          )}
        </div>

        <div className="card">
          <div className="small">PWA</div>
          <p className="small">
            iOS : Safari → Partager → « Ajouter à l’écran d’accueil »
          </p>
        </div>
      </div>
    </div>
  );
}
