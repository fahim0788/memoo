"use client";

import { useState, useRef } from "react";

type Card = {
  question: string;
  answers: string[];
};

type CreateDeckViewProps = {
  onBack: () => void;
  onCreated: () => void;
};

function parseJSON(text: string): { name: string; cards: Card[] } | null {
  try {
    const data = JSON.parse(text);
    if (!data.name || !Array.isArray(data.cards)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function parseCSV(text: string): Card[] | null {
  try {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) return null; // Need header + at least one card

    const header = lines[0].toLowerCase();

    // Check if first column is "question"
    if (!header.startsWith('question')) return null;

    const cards: Card[] = [];
    for (let i = 1; i < lines.length; i++) {
      // Split by comma, but respect quoted fields
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));

      if (parts.length < 2) continue; // Need at least question and one answer

      const question = parts[0];
      const answers = parts.slice(1).filter(a => a.length > 0);

      if (question && answers.length > 0) {
        cards.push({ question, answers });
      }
    }

    return cards.length > 0 ? cards : null;
  } catch {
    return null;
  }
}

export function CreateDeckView({ onBack, onCreated }: CreateDeckViewProps) {
  const [name, setName] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    setError(null);

    if (!name.trim()) {
      setError("Le nom de la liste est requis");
      return;
    }

    if (!jsonText.trim()) {
      setError("Le contenu JSON est requis");
      return;
    }

    // Try parsing as JSON first
    const parsed = parseJSON(jsonText);
    if (!parsed) {
      setError("Format JSON invalide. Vérifiez la syntaxe.");
      return;
    }

    if (parsed.cards.length === 0) {
      setError("La liste doit contenir au moins une carte");
      return;
    }

    // Validate cards
    for (const card of parsed.cards) {
      if (!card.question || !Array.isArray(card.answers) || card.answers.length === 0) {
        setError("Chaque carte doit avoir une question et au moins une réponse");
        return;
      }
    }

    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE}/my-decks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: parsed.name || name.trim(),
          cards: parsed.cards,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      onCreated();
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const ext = file.name.toLowerCase().split('.').pop();

      if (ext === 'json') {
        // Validate JSON
        const parsed = parseJSON(text);
        if (parsed) {
          setJsonText(text);
          if (!name.trim() && parsed.name) {
            setName(parsed.name);
          }
          setError(null);
        } else {
          setError("Fichier JSON invalide");
        }
      } else if (ext === 'csv') {
        // Parse CSV and convert to JSON format
        const cards = parseCSV(text);
        if (cards) {
          const jsonData = {
            name: name.trim() || file.name.replace(/\.[^/.]+$/, ""),
            cards,
          };
          setJsonText(JSON.stringify(jsonData, null, 2));
          if (!name.trim()) {
            setName(jsonData.name);
          }
          setError(null);
        } else {
          setError("Fichier CSV invalide. Vérifiez le format.");
        }
      } else {
        setError("Format non supporté. Utilisez JSON ou CSV.");
      }
    };

    reader.readAsText(file);

    // Reset input so the same file can be selected again
    e.target.value = '';
  }

  return (
    <>
      <div className="header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <h2>Créer une liste personnalisée</h2>
          <button onClick={onBack} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", flex: "none", minWidth: "auto" }}>
            ← Retour
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label htmlFor="deck-name" className="small" style={{ display: "block", marginBottom: "0.25rem" }}>
              Nom de la liste
            </label>
            <input
              id="deck-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ma liste personnalisée"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label htmlFor="deck-json" className="small" style={{ display: "block", marginBottom: "0.25rem" }}>
              Contenu JSON
            </label>
            <textarea
              id="deck-json"
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder='{"name": "Ma liste", "cards": [{"question": "Q1?", "answers": ["R1", "R2"]}]}'
              rows={10}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "0.875rem" }}
            />
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv"
              onChange={handleFileImport}
              style={{ display: "none" }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ width: "100%" }}
            >
              📁 Importer depuis un fichier (JSON/CSV)
            </button>
          </div>

          {error && (
            <div style={{ color: "#c43a31", fontSize: "0.875rem" }}>
              ⚠️ {error}
            </div>
          )}

          <button
            className="primary"
            onClick={handleCreate}
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Création..." : "Créer la liste"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="small" style={{ color: "#666" }}>
          <h3 style={{ marginTop: 0 }}>Format JSON attendu :</h3>
          <pre style={{ background: "#f5f5f5", padding: "0.5rem", borderRadius: "4px", overflow: "auto" }}>
{`{
  "name": "Nom de la liste",
  "cards": [
    {
      "question": "Quelle est la capitale de France?",
      "answers": ["Paris", "paris"]
    },
    {
      "question": "Combien font 2+2?",
      "answers": ["4", "quatre"]
    }
  ]
}`}
          </pre>

          <h3>Format CSV attendu :</h3>
          <pre style={{ background: "#f5f5f5", padding: "0.5rem", borderRadius: "4px", overflow: "auto" }}>
{`question,answer1,answer2,answer3
Capitale de France?,Paris,paris
2+2=?,4,quatre`}
          </pre>
          <p style={{ marginTop: "0.5rem", fontSize: "0.75rem" }}>
            📝 La première ligne doit commencer par "question", suivie des colonnes de réponses.
            <br />
            Les colonnes de réponses vides sont ignorées.
          </p>
        </div>
      </div>
    </>
  );
}
