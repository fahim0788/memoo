import { useState } from "react";
import type { DeckFromApi } from "../lib/api";
import { Header } from "./Header";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatsCard } from "./StatsCard";
import type { Stats } from "../hooks/useStats";

type MenuViewProps = {
  myLists: DeckFromApi[];
  userName: string;
  onStudy: (deck: DeckFromApi) => void;
  onEdit: (deck: DeckFromApi) => void;
  onExplore: () => void;
  onRemove: (deckId: string) => void;
  onLogout: () => void;
  stats: Stats | null;
};

export function MenuView({
  myLists,
  userName,
  onStudy,
  onEdit,
  onExplore,
  onRemove,
  onLogout,
  stats,
}: MenuViewProps) {
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");

  const q = search.toLowerCase().trim();
  const filteredLists = q ? myLists.filter(d => d.name.toLowerCase().includes(q)) : myLists;

  return (
    <>
      <Header userName={userName} onLogout={onLogout} />

      {stats && <StatsCard stats={stats} />}

      {myLists.length > 0 && (
        <div className="card">
          <div className="small">Mes listes</div>
          {myLists.length >= 3 && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ marginBottom: "0.25rem" }}
            />
          )}
          {filteredLists.map(deck => (
            <button key={deck.id} className="primary" style={{ position: "relative", flex: 1 }} onClick={() => onStudy(deck)}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{deck.isOwned ? "👤" : "📂"}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{deck.name}</span>
                <span
                  style={{ display: "flex", gap: "4px", flex: "none" }}
                  onClick={e => e.stopPropagation()}
                >
                  {deck.isOwned && (
                    <span
                      onClick={() => onEdit(deck)}
                      style={{ cursor: "pointer", fontSize: "0.85rem", padding: "2px 4px" }}
                      title="Modifier"
                    >
                      ✏️
                    </span>
                  )}
                  <span
                    onClick={() => setRemoveTarget({ id: deck.id, name: deck.name })}
                    style={{ cursor: "pointer", fontSize: "0.85rem", padding: "2px 4px" }}
                    title="Retirer"
                  >
                    ✕
                  </span>
                </span>
              </div>
              <span className="small" style={{ display: "block", fontWeight: 400, marginTop: "2px" }}>
                {deck.cardCount} cartes
              </span>
            </button>
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

      <ConfirmDialog
        isOpen={removeTarget !== null}
        title="Retirer la liste ?"
        message={`Retirer "${removeTarget?.name}" de vos listes ? Vous pourrez la rajouter plus tard.`}
        confirmLabel="Retirer"
        cancelLabel="Annuler"
        variant="warning"
        onConfirm={() => {
          if (removeTarget) onRemove(removeTarget.id);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
