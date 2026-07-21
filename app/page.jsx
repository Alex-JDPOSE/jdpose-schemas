"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import SchemaEditor from "../components/SchemaEditor";

export default function Home() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClientNom, setNewClientNom] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [schemas, setSchemas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("schema_clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setClients(data || []);
    setLoading(false);
  };

  const loadSchemas = async (clientId) => {
    const { data, error } = await supabase
      .from("schema_dessins")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (!error) setSchemas(data || []);
  };

  const handleCreateClient = async () => {
    if (!newClientNom.trim()) return;
    const { data, error } = await supabase
      .from("schema_clients")
      .insert({ nom: newClientNom.trim() })
      .select()
      .single();
    if (!error) {
      setNewClientNom("");
      setClients((prev) => [data, ...prev]);
    }
  };

  const openClient = async (client) => {
    setSelectedClient(client);
    setMessage("");
    await loadSchemas(client.id);
  };

  const handleSaveSchema = async (blob) => {
    if (!selectedClient) return;
    setSaving(true);
    setMessage("");

    try {
      const fileName = `${selectedClient.id}-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("schema-dessins")
        .upload(fileName, blob, { contentType: "image/png" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("schema-dessins")
        .getPublicUrl(uploadData.path);

      const { error: insertError } = await supabase.from("schema_dessins").insert({
        client_id: selectedClient.id,
        image_url: urlData.publicUrl,
      });

      if (insertError) throw insertError;

      setMessage("Schéma enregistré ✅");
      await loadSchemas(selectedClient.id);
    } catch (err) {
      console.error(err);
      setMessage("Erreur lors de l'enregistrement ❌");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchema = async (schema) => {
    const confirmed = window.confirm("Supprimer ce schéma définitivement ?");
    if (!confirmed) return;

    try {
      const fileName = schema.image_url.split("/schema-dessins/").pop();
      await supabase.storage.from("schema-dessins").remove([fileName]);

      await supabase.from("schema_dessins").delete().eq("id", schema.id);

      setSchemas((prev) => prev.filter((s) => s.id !== schema.id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  const Logo = () => (
  <img src="/logo-jdpose.png" alt="JDPOSE" style={styles.logo} />
);

  if (selectedClient) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
        <Logo />
        <button onClick={() => setSelectedClient(null)} style={styles.backBtn}>
          ← Retour aux dossiers
        </button>
        <h1 style={styles.title}>{selectedClient.nom}</h1>

        <SchemaEditor onSave={handleSaveSchema} />
        {saving && <p>Enregistrement en cours...</p>}
        {message && <p>{message}</p>}

        {schemas.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <h2 style={{ fontSize: 18 }}>Schémas précédents</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {schemas.map((s) => (
                <div key={s.id} style={styles.thumbWrapper}>
                  <img src={s.image_url} alt="schéma" style={styles.thumb} />
                  <button
                    onClick={() => handleDeleteSchema(s)}
                    style={styles.deleteBtn}
                    title="Supprimer ce schéma"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
      <Logo />
      <h1 style={styles.title}>Schémas techniciens</h1>

      <div style={styles.newClientRow}>
        <input
          type="text"
          placeholder="Nom du client / chantier"
          value={newClientNom}
          onChange={(e) => setNewClientNom(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleCreateClient} style={styles.addBtn}>
          + Nouveau dossier
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : clients.length === 0 ? (
        <p style={{ color: "#888" }}>Aucun dossier pour l'instant.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
          {clients.map((c) => (
            <button key={c.id} onClick={() => openClient(c)} style={styles.clientCard}>
              📁 {c.nom}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  logo: {
    fontSize: 26,
    fontWeight: 800,
    color: "#2f6fed",
    letterSpacing: 1,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 16 },
  newClientRow: { display: "flex", gap: 8 },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 15,
  },
  addBtn: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#2f6fed",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  clientCard: {
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    fontSize: 16,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#2f6fed",
    cursor: "pointer",
    fontSize: 14,
    padding: 0,
    marginBottom: 12,
  },
  thumbWrapper: {
    position: "relative",
    width: 160,
  },
  thumb: {
    width: 160,
    borderRadius: 8,
    border: "1px solid #ddd",
    display: "block",
  },
  deleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #e0a0a0",
    color: "#a12626",
    borderRadius: "50%",
    width: 24,
    height: 24,
    cursor: "pointer",
    fontSize: 13,
    lineHeight: 1,
  },
};
