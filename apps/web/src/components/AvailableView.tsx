import { useState } from "react";
import type { DeckFromApi } from "../lib/api";
import { ConfirmDialog } from "./ConfirmDialog";

type AvailableViewProps = {
  publicLists: DeckFromApi[];
  personalLists: DeckFromApi[];
  onAdd: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  onBack: () => void;
};

export function AvailableView({
  publicLists,
  personalLists,
  onAdd,
  onDelete,
  onBack,
}: AvailableViewProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");

  const q = search.toLowerCase().trim();
  const filteredPublic = q ? publicLists.filter(d => d.name.toLowerCase().includes(q)) : publicLists;
  const filteredPersonal = q ? personalLists.filter(d => d.name.toLowerCase().includes(q)) : personalLists;

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <h2>Listes disponibles</h2>
          <button onClick={onBack} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", flex: "none", minWidth: "auto" }}>
            ← Retour
          </button>
        </div>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher une liste..."
        style={{ marginBottom: "-0.25rem" }}
      />

      {/* Public Lists Section */}
      <div className="card">
        <div className="small" style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
          📂 Listes publiques ({filteredPublic.length})
        </div>

        {filteredPublic.length === 0 && (
          <p className="small" style={{ color: "#666", marginTop: "0.5rem" }}>
            Toutes les listes publiques sont déjà activées.
          </p>
        )}

        {filteredPublic.map(deck => (
          <div
            key={deck.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              padding: "0.75rem 0",
              borderTop: "1px solid #eee",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{deck.name}</div>
              <div className="small" style={{ color: "#666" }}>
                {deck.cardCount} cartes
              </div>
            </div>
            <button
              className="primary"
              onClick={() => onAdd(deck.id)}
              style={{ flex: "none", minWidth: 0, padding: "8px 16px" }}
            >
              Ajouter
            </button>
          </div>
        ))}
      </div>

      {/* Personal Lists Section */}
      <div className="card">
        <div className="small" style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
          👤 Mes listes personnalisées ({filteredPersonal.length})
        </div>

        {filteredPersonal.length === 0 && (
          <p className="small" style={{ color: "#666", marginTop: "0.5rem" }}>
            Aucune liste personnalisée disponible.
            <br />
            Créez-en une depuis le menu principal.
          </p>
        )}

        {filteredPersonal.map(deck => (
          <div
            key={deck.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              padding: "0.75rem 0",
              borderTop: "1px solid #eee",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{deck.name}</div>
              <div className="small" style={{ color: "#666" }}>
                {deck.cardCount} cartes
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="primary"
                onClick={() => onAdd(deck.id)}
                style={{ flex: "none", minWidth: 0, padding: "8px 16px" }}
              >
                Ajouter
              </button>
              <button
                onClick={() => setDeleteTarget({ id: deck.id, name: deck.name })}
                style={{
                  flex: "none",
                  minWidth: 0,
                  padding: "8px 12px",
                  background: "#fee",
                  color: "#c00",
                  border: "1px solid #fcc",
                }}
                title="Supprimer définitivement"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Supprimer la liste ?"
        message={`Êtes-vous sûr de vouloir supprimer définitivement la liste "${deleteTarget?.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
