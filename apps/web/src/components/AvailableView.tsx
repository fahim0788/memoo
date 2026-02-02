import type { DeckFromApi } from "../lib/api";

type AvailableViewProps = {
  allLists: DeckFromApi[];
  myListIds: Set<string>;
  onAdd: (deckId: string) => void;
  onBack: () => void;
};

export function AvailableView({
  allLists,
  myListIds,
  onAdd,
  onBack,
}: AvailableViewProps) {
  const available = allLists.filter(d => !myListIds.has(d.id));

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Listes disponibles</h2>
          <button onClick={onBack} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
            ← Retour
          </button>
        </div>
      </div>

      {available.length === 0 && (
        <div className="card">
          <p className="small">Toutes les listes sont déjà dans vos listes.</p>
        </div>
      )}

      {available.map(deck => (
        <div className="card" key={deck.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{deck.name}</div>
              <div className="small">{deck.cardCount} cartes</div>
            </div>
            <button
              className="primary"
              onClick={() => onAdd(deck.id)}
              style={{ flex: "none", minWidth: 0, padding: "8px 16px" }}
            >
              Ajouter
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
