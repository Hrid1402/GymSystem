import { useState } from "react";
import { apiClient } from "../../api/client";
import { usersApi } from "../../api/usersApi";
import DashboardLayout from "../../components/layout/DashboardLayout";

export default function AccesoManual() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Estados para la validación de membresía por cliente
    const [validations, setValidations] = useState({});
    const [validatingId, setValidatingId] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setValidations({});
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

    // Función para validar la membresía cumpliendo los criterios de aceptación
    const handleValidateAccess = async (client) => {
        setValidatingId(client.id);
        try {
            // Añadimos un timestamp para evitar caché (304) y asegurar respuesta fresca
            const response = await apiClient.get(`/memberships?user_id=${client.id}&_t=${Date.now()}`);
            
            const responseData = response.data !== undefined ? response.data : response;

            const memberships = Array.isArray(responseData)
                ? responseData
                : (responseData.memberships || []);

            // Obtenemos la fecha actual en formato YYYY-MM-DD
            const today = new Date().toISOString().split('T')[0];

            // Criterio: Permitido si el estado es ACTIVE y está vigente por fechas
            const hasActiveMembership = memberships.some((m) => {
                const status = (m.status || '');
                if (status !== 'ACTIVE') return false;

                if (m.start_date && m.end_date) {
                    return today >= m.start_date && today <= m.end_date;
                }
                return true;
            });

            setValidations((prev) => ({
                ...prev,
                [client.id]: {
                    status: hasActiveMembership ? 'PERMITIDO' : 'RECHAZADO',
                    message: hasActiveMembership
                        ? 'Acceso Permitido: Membresía vigente.'
                        : 'Acceso Rechazado: El cliente no cuenta con una membresía activa que incluya la fecha actual.'
                }
            }));
        } catch (error) {
            console.error("Error al validar la membresía:", error);
            setValidations((prev) => ({
                ...prev,
                [client.id]: {
                    status: 'ERROR',
                    message: 'No fue posible completar la validación de membresía en este momento.'
                }
            }));
        } finally {
            setValidatingId(null);
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

                    {results.map((client) => {
                        const validation = validations[client.id];
                        const isValidating = validatingId === client.id;

                        return (
                            <div key={client.id} style={{ border: "1px solid #e2e8f0", padding: "18px", borderRadius: "8px", marginBottom: "16px", background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <p style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "bold", color: "#1e293b" }}>
                                            {client.first_name} {client.last_name}
                                        </p>
                                        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                                            DNI: {client.dni}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleValidateAccess(client)}
                                        disabled={isValidating}
                                        style={{ padding: "10px 18px", background: "#0f172a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                                    >
                                        {isValidating ? "Validando..." : "Validar Acceso"}
                                    </button>
                                </div>

                                {validation && (
                                    <div style={{
                                        marginTop: "14px",
                                        padding: "12px",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        backgroundColor: 
                                            validation.status === 'PERMITIDO' ? '#dcfce7' :
                                            validation.status === 'RECHAZADO' ? '#fee2e2' : '#f1f5f9',
                                        color: 
                                            validation.status === 'PERMITIDO' ? '#166534' :
                                            validation.status === 'RECHAZADO' ? '#991b1b' : '#475569',
                                        border: `1px solid ${
                                            validation.status === 'PERMITIDO' ? '#bbf7d0' :
                                            validation.status === 'RECHAZADO' ? '#fecaca' : '#cbd5e1'
                                        }`
                                    }}>
                                        {validation.message}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}