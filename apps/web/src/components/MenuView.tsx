import { useState } from "react";
import type { DeckFromApi } from "../lib/api";
import { SettingsButton } from "./SettingsButton";
import { ConfirmDialog } from "./ConfirmDialog";
import { StatsCard } from "./StatsCard";
import type { Stats } from "../hooks/useStats";

type MenuViewProps = {
  myLists: DeckFromApi[];
  userName: string;
  onStudy: (deck: DeckFromApi) => void;
  onEdit: (deck: DeckFromApi) => void;
  onExplore: () => void;
  onCreateDeck: () => void;
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
  onCreateDeck,
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
      <div className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <img src="/logo-memoo-black.png" alt="" style={{ width: "28px", height: "28px" }} className="dark:hidden" />
            <img src="/logo-memoo-white.png" alt="" style={{ width: "28px", height: "28px" }} className="hidden dark:block" />
            Memoo
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{userName}</span>
            <SettingsButton />
            <button onClick={onLogout} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", minWidth: "auto" }}>
              Déconnexion
            </button>
          </div>
        </div>
      </div>

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
            <div key={deck.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="primary" style={{ flex: 1 }} onClick={() => onStudy(deck)}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{deck.isOwned ? "👤" : "📂"}</span>
                  <span style={{ flex: 1, textAlign: "left" }}>{deck.name}</span>
                </div>
                <span className="small" style={{ display: "block", fontWeight: 400, marginTop: "2px" }}>
                  {deck.cardCount} cartes
                </span>
              </button>
              {deck.isOwned && (
                <button
                  onClick={() => onEdit(deck)}
                  style={{ flex: "none", minWidth: 0, width: "36px", padding: "8px", fontSize: "0.85rem" }}
                  title="Modifier"
                >
                  ✏️
                </button>
              )}
              <button
                onClick={() => setRemoveTarget({ id: deck.id, name: deck.name })}
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

      <div className="card">
        <button onClick={onCreateDeck} className="primary" style={{ margin: 0 }}>
          ➕ Ajouter une liste personnalisée
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
