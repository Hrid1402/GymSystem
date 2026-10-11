import { useState } from "react";
import { usersApi } from "../../api/usersApi";
import DashboardLayout from "../../components/layout/DashboardLayout";

export default function AccesoManual() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const data = await usersApi.search(query.trim());
            setResults(data.users || []);
            setSearched(true);
        } catch (error) {
            console.error("Error al buscar cliente por DNI:", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout title="Validación de Acceso Manual por DNI">
            <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px" }}>
                <form onSubmit={handleSearch} style={{ display: "flex", gap: "12px", marginBottom: "30px" }}>
                    <input
                        type="text"
                        placeholder="Ingrese número de DNI del cliente"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        maxLength={8}
                        style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "15px" }}
                    />
                    <button type="submit" style={{ padding: "12px 24px", background: "#1769e0", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}>
                        {loading ? "Buscando..." : "Buscar DNI"}
                    </button>
                </form>

                <div>
                    {searched && results.length === 0 && (
                        <p style={{ color: "#64748b", textAlign: "center" }}>No se encontró ningún cliente registrado con ese DNI.</p>
                    )}

                    {results.map((client) => (
                        <div key={client.id} style={{ border: "1px solid #e2e8f0", padding: "18px", borderRadius: "8px", marginBottom: "12px", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                            <div>
                                <p style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "bold", color: "#1e293b" }}>
                                    {client.first_name} {client.last_name}
                                </p>
                                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                                    DNI: {client.dni}
                                </p>
                            </div>
                            <button
                                onClick={() => alert(`Acceso permitido para: ${client.first_name} ${client.last_name}`)}
                                style={{ padding: "8px 16px", background: "#0f172a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
                            >
                                Validar Acceso
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}