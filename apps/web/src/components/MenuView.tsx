import type { DeckFromApi } from "../lib/api";

type MenuViewProps = {
  myLists: DeckFromApi[];
  onStudy: (deck: DeckFromApi) => void;
  onExplore: () => void;
  onRemove: (deckId: string) => void;
  onLogout: () => void;
};

export function MenuView({
  myLists,
  onStudy,
  onExplore,
  onRemove,
  onLogout,
}: MenuViewProps) {
  return (
    <>
      <div className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Memoo</h2>
          <button onClick={onLogout} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
            Déconnexion
          </button>
        </div>
      </div>

      {myLists.length > 0 && (
        <div className="card">
          <div className="small">Mes listes</div>
          {myLists.map(deck => (
            <div key={deck.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="primary" style={{ flex: 1 }} onClick={() => onStudy(deck)}>
                {deck.name}
                <span className="small" style={{ display: "block", fontWeight: 400, marginTop: "2px" }}>
                  {deck.cardCount} cartes
                </span>
              </button>
              <button
                onClick={() => onRemove(deck.id)}
                style={{ flex: "none", minWidth: 0, width: "36px", padding: "8px", fontSize: "0.85rem" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {myLists.length === 0 && (
        <div className="card">
          <p className="small">Vous n'avez pas encore de liste. Explorez les listes disponibles ci-dessous.</p>
        </div>
      )}

      <div className="card">
        <button onClick={onExplore} style={{ margin: 0 }}>
          Explorer les listes disponibles
        </button>
      </div>
    </>
  );
}
