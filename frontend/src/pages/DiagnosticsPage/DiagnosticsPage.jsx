import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend
} from "recharts";
import { Battery, AlertTriangle, Zap, CheckCircle2, Bot, Sparkles, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';

const FEATURE_LABELS = {
    inv_kwh_total: "Total Energy (kWh)",
    roll_temp_mean_7d: "Avg Temp 7d",
    roll_kwh_today_std_7d: "Energy Variability 7d",
    roll_temp_std_7d: "Temp Volatility 7d",
    roll_temp_std_3d: "Temp Volatility 3d",
    roll_temp_mean_3d: "Avg Temp 3d",
    roll_pv1_power_std_7d: "PV1 Power Variability 7d",
    anom_night_power_7d: "Night Power Anomaly 7d",
    roll_kwh_today_mean_7d: "Daily Energy Mean 7d",
    roll_kwh_today_std_3d: "Energy Variability 3d",
    str_worst_ratio_rmean_7d: "String Imbalance Ratio 7d",
    day_of_week: "Day of Week",
    inv_power: "Inverter Power",
    str_mean_rmean_7d: "String Mean Ratio 7d",
    roll_kwh_today_mean_3d: "Daily Energy Mean 3d",
    stress_hightemp_7d: "High Temp Stress Days 7d",
    is_daytime: "Is Daytime",
    anom_night_hightemp_7d: "Night High Temp Anomaly 7d",
    roll_power_std_3d: "Power Volatility 3d",
    roll_pv1_power_mean_3d: "PV1 Power Mean 3d",
};

// Compute anomaly score for each record (used for coloring/sorting the risk table)
function computeAnomalyScore(row) {
    let score = 0;
    if (row.anom_night_power_7d > 0) score += row.anom_night_power_7d * 20;
    if (row.stress_hightemp_7d > 0) score += Math.min(row.stress_hightemp_7d, 100);
    if (row.str_worst_ratio_rmean_7d > 0) score += row.str_worst_ratio_rmean_7d * 500;
    if (row.roll_kwh_today_mean_7d < 0) score += Math.abs(row.roll_kwh_today_mean_7d) * 0.3;
    if (row.roll_temp_std_7d > 15) score += (row.roll_temp_std_7d - 15) * 3;
    if (row.roll_pv1_power_std_7d > 50) score += (row.roll_pv1_power_std_7d - 50) * 0.5;
    if (row.anom_night_hightemp_7d > 0) score += 5;
    if (row.roll_kwh_today_std_7d > 2000) score += (row.roll_kwh_today_std_7d - 2000) * 0.02;
    return Math.min(score, 100);
}

// Normalize feature value to 0-1 for anomaly contribution
function featureDeviation(key, value, allDataRows) {
    if (!allDataRows || allDataRows.length === 0) return 0;

    const vals = allDataRows.map(r => r[key]);
    const validVals = vals.filter(v => typeof v === 'number' && !isNaN(v));
    if (validVals.length === 0) return 0;

    const mean = validVals.reduce((a, b) => a + b, 0) / validVals.length;
    const std = Math.sqrt(validVals.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / validVals.length) || 1;
    return Math.abs((value - mean) / std);
}

export function DiagnosticsPage({ inverters, selectedInverter, csvContext, onSelectInverter }) {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedRecord, setSelectedRecord] = useState(null);

    // 1. Parse CSV and filter specifically for the selected inverter's record
    const { inverterData, fleetStats, allRows } = useMemo(() => {
        if (!csvContext || !selectedInverter) return { inverterData: [], fleetStats: null };

        try {
            const results = Papa.parse(csvContext, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true
            });

            const parsedData = results.data;
            if (!parsedData || parsedData.length === 0) return { inverterData: [], fleetStats: null };

            // Compute fleet stats for comparison
            const stats = {};
            Object.keys(FEATURE_LABELS).forEach(key => {
                const vals = parsedData.map(r => r[key]).filter(v => typeof v === 'number' && !isNaN(v));
                if (vals.length > 0) {
                    stats[key] = vals.reduce((a, b) => a + b, 0) / vals.length;
                }
            });

            // Find this specific inverter's row
            let subset = [];
            if (selectedInverter.inverter_id.startsWith("INV-CSV-")) {
                const idxStr = selectedInverter.inverter_id.split("-").pop();
                const idx = parseInt(idxStr) - 1;
                const row = parsedData[idx];
                if (row) subset = [row];
            } else {
                const idCol = Object.keys(parsedData[0]).find(k => k.toLowerCase().includes('id'));
                if (idCol) {
                    subset = parsedData.filter(row => String(row[idCol]) === selectedInverter.inverter_id);
                }
            }
            return { inverterData: subset, fleetStats: stats, allRows: parsedData };
        } catch (e) {
            console.error("Failed to parse CSV context for analytics:", e);
            return { inverterData: [], fleetStats: null, allRows: [] };
        }
    }, [csvContext, selectedInverter]);

    // 2. Compute anomaly scores on the record
    const anomalyRows = useMemo(() => {
        if (inverterData.length === 0) return [];
        return inverterData.map((r, i) => ({ ...r, _idx: i, _score: computeAnomalyScore(r) }));
    }, [inverterData]);

    const topAnomalyRow = anomalyRows.length > 0 ? anomalyRows[0] : null;

    // 3. SHAP data (using backend SHAP if available, falling back to std deviation)
    const { shapData, radarData } = useMemo(() => {
        if (!topAnomalyRow) return { shapData: [], radarData: [] };

        let hasBackendShap = selectedInverter && selectedInverter.top_features && selectedInverter.top_features.length > 0 && selectedInverter.top_features[0].feature !== "no_model_loaded";

        // Calculate statistical deviation for ALL features relative to fleet
        const statsFeatures = Object.entries(FEATURE_LABELS)
            .map(([key, label]) => {
                const val = topAnomalyRow[key] || 0;
                const fleetMean = fleetStats?.[key] || 0;
                return {
                    key,
                    label: label.length > 22 ? label.slice(0, 20) + "…" : label,
                    fullLabel: label,
                    value: val,
                    deviation: featureDeviation(key, val, allRows),
                    direction: val > fleetMean ? "high" : "low"
                }
            })
            .sort((a, b) => b.deviation - a.deviation);

        let finalShap = [];

        if (hasBackendShap) {
            // Use REAL SHAP FROM XGBOOST
            finalShap = selectedInverter.top_features.map((tf, i) => {
                const key = tf.feature;
                const label = FEATURE_LABELS[key] || key;
                const val = topAnomalyRow[key] || 0;
                return {
                    key,
                    label: label.length > 22 ? label.slice(0, 20) + "…" : label,
                    fullLabel: label,
                    value: val,
                    rawShap: tf.shap_value,
                    deviation: Math.abs(tf.shap_value) * 10,
                    direction: tf.shap_value > 0 ? "high" : "low"
                };
            });

            // If backend only gave us a few, fill to 8+ using statistical drift
            if (finalShap.length < 8) {
                const existingKeys = new Set(finalShap.map(s => s.key));
                const extras = statsFeatures.filter(sf => !existingKeys.has(sf.key)).slice(0, 8 - finalShap.length);
                finalShap = [...finalShap, ...extras];
            }
        } else {
            finalShap = statsFeatures;
        }

        const displayShap = finalShap.slice(0, 3);
        // Radar always takes top 8 to ensure a full spider web
        const radar = finalShap.slice(0, 8).map(d => ({
            feature: d.label,
            deviation: Math.min(d.deviation * 35, 120),
            fullValue: d.value
        }));

        return { shapData: displayShap, radarData: radar };
    }, [topAnomalyRow, allRows, selectedInverter, fleetStats]);

    // 4. Hook GenAI to FastAPI
    async function runAIAnalysis() {
        if (!selectedInverter) return;
        setLoading(true);
        try {
            const res = await api.explain(selectedInverter.inverter_id, {
                risk_score: selectedInverter.risk_score,
                risk_label: selectedInverter.risk_label,
                top_features: selectedInverter.top_features,
            }, "Output strictly in JSON matching the Analytics UI schema.");

            // AI returns text, try parsing
            const clean = res.narrative.replace(/```json|```/g, "").trim();
            setAnalysis(JSON.parse(clean));
            setActiveTab("ai");
        } catch (e) {
            console.error("AI Analysis parsing failed:", e);
            // Fallback
            setAnalysis({
                riskLevel: selectedInverter.risk_label || "UNKNOWN",
                summary: `The backend connected, but the LLM failed to return valid JSON. Error: ${e.message}`,
                healthScore: 50,
                topCauses: shapData.slice(0, 3).map((sd, i) => ({
                    rank: i + 1,
                    name: sd.fullLabel,
                    importance: Math.round(Math.min(sd.deviation * 20, 100)),
                    category: "electrical",
                    description: `Anomaly detected in ${sd.fullLabel} contributing heavily to prediction model.`,
                    dataEvidence: `${sd.value} (Significant deviation)`,
                    action: "Inspect field telemetry"
                })),
                criticalEvents: []
            });
            setActiveTab("ai");
        }
        setLoading(false);
    }

    const riskColor = { CRITICAL: "#ff2d55", HIGH: "#ff9500", MEDIUM: "#ffd60a", LOW: "#06d6a0" };
    const catColor = { thermal: "#ff6b35", electrical: "#4cc9f0", mechanical: "#7b2d8b", software: "#06d6a0" };

    if (!selectedInverter) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                Please upload a CSV in Sandbox or select an inverter in Predicted Risks.
            </div>
        );
    }

    if (inverterData.length === 0) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
                Could not parse context rows for {selectedInverter.inverter_id}. Did you upload a valid CSV dataset?
            </div>
        );
    }

    return (
        <div style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            background: "#0a0a0f",
            minHeight: "100vh",
            color: "#e0e0e8",
            padding: "0",
            marginTop: "-24px",
            marginRight: "-24px",
            marginLeft: "-24px",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .tab-btn { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 12px; letter-spacing: 0.1em; padding: 8px 20px; color: #666; transition: all 0.2s; text-transform: uppercase; }
        .tab-btn.active { color: #4cc9f0; border-bottom: 2px solid #4cc9f0; }
        .tab-btn:hover { color: #aaa; }
        .card { background: #111118; border: 1px solid #1e1e2e; border-radius: 4px; padding: 20px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 2px; font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
        .glow-line { height: 1px; background: linear-gradient(90deg, transparent, #4cc9f0, transparent); margin: 0; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .row-hover:hover { background: #1a1a26 !important; cursor: pointer; }
        .shimmer { background: linear-gradient(90deg, #111118 25%, #1a1a26 50%, #111118 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

            {/* Page Title & Risk Overview - Handled by DashboardHome, but keeping minimal internal context */}
            <div style={{ background: "#0d0d14", borderBottom: "1px solid #1e1e2e", padding: "16px 28px 24px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%", gap: "8px" }}>
                    <div>
                        <div style={{ fontFamily: "inherit", fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", color: "#fff" }}>
                            Failure Diagnostics
                        </div>
                        <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                            Inverter ID: {selectedInverter.inverter_id} • XGBoost + SHAP Analytical Engine
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
                        <div className="card" style={{ padding: "10px 24px", textAlign: "center", minWidth: "120px" }}>
                            <div style={{ fontSize: "24px", fontWeight: 700, color: riskColor[selectedInverter.risk_label] || "#4cc9f0" }}>{selectedInverter.risk_score}%</div>
                            <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>Risk Score</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "20px" }}>
                    {[["overview", "Overview"], ["shap", "Feature Impact"], ["ai", "AI Diagnosis"]].map(([t, l]) => (
                        <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>{l}</button>
                    ))}
                </div>
            </div>
            <div className="glow-line" />

            <div style={{ padding: "24px 28px" }}>

                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                    <div>
                        {/* KPI Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                            {[
                                { label: "Night Power", value: Number(topAnomalyRow?.anom_night_power_7d || 0), unit: "events", color: "#ff2d55" },
                                { label: "High Temp Stress", value: Number(topAnomalyRow?.stress_hightemp_7d || 0), unit: "days", color: "#ff9500" },
                                { label: "String Imbalance", value: (Number(topAnomalyRow?.str_worst_ratio_rmean_7d || 0) * 100).toFixed(1) + "%", unit: "ratio", color: "#ffd60a" },
                                { label: "Night Temp", value: Number(topAnomalyRow?.anom_night_hightemp_7d || 0).toFixed(1) + "°C", unit: "offset", color: "#c77dff" },
                            ].map(kpi => (
                                <div key={kpi.label} className="card" style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "24px", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                                    <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "2px" }}>{kpi.label}</div>
                                    <div style={{ fontSize: "10px", color: "#555" }}>{kpi.unit}</div>
                                </div>
                            ))}
                        </div>

                        {/* Fleet Comparison */}
                        <div className="card" style={{ marginBottom: "20px" }}>
                            <div style={{ fontSize: "12px", color: "#4cc9f0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px", textAlign: "center", fontWeight: 600 }}>
                                Fleet Peer Comparison (Selected vs Fleet Average)
                            </div>
                            <div style={{ height: "220px" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: "Energy Mean", inverter: topAnomalyRow?.roll_kwh_today_mean_7d, fleet: fleetStats?.roll_kwh_today_mean_7d },
                                            { name: "Temp Mean", inverter: topAnomalyRow?.roll_temp_mean_7d, fleet: fleetStats?.roll_temp_mean_7d },
                                            { name: "Temp Volatility", inverter: topAnomalyRow?.roll_temp_std_7d, fleet: fleetStats?.roll_temp_std_7d },
                                            { name: "String Health", inverter: (1 - (topAnomalyRow?.str_worst_ratio_rmean_7d || 0)) * 100, fleet: (1 - (fleetStats?.str_worst_ratio_rmean_7d || 0)) * 100 },
                                        ]}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 10 }} />
                                        <YAxis tick={{ fill: "#555", fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", fontFamily: "inherit", color: "#fff", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)" }}
                                            itemStyle={{ color: "#fff" }}
                                            labelStyle={{ color: "#4cc9f0", marginBottom: "4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}
                                            cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                                        />
                                        <Legend />
                                        <Bar dataKey="inverter" fill="#4cc9f0" name="This Inverter" radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="fleet" fill="#333" name="Fleet Average" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Feature List */}
                        <div className="card">
                            <div style={{ fontSize: "11px", color: "#4cc9f0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px", textAlign: "center", fontWeight: 600 }}>
                                Snapshot Telemetry Attributes
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div style={{ overflowY: "auto", maxHeight: "300px" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
                                                <th style={{ padding: "8px", color: "#555", textAlign: "left" }}>Parameter</th>
                                                <th style={{ padding: "8px", color: "#555", textAlign: "right" }}>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(topAnomalyRow || {})
                                                .filter(([k]) => !k.startsWith('_') && !k.startsWith('plant_id'))
                                                .slice(0, 10)
                                                .map(([k, v]) => (
                                                    <tr key={k} style={{ borderBottom: "1px solid #1a1a26" }}>
                                                        <td style={{ padding: "8px", color: "#888" }}>{FEATURE_LABELS[k] || k}</td>
                                                        <td style={{ padding: "8px", textAlign: "right", color: "#fff", fontWeight: 600 }}>{typeof v === 'number' ? v.toFixed(3) : String(v)}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ overflowY: "auto", maxHeight: "300px" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                        <thead>
                                            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
                                                <th style={{ padding: "8px", color: "#555", textAlign: "left" }}>Parameter</th>
                                                <th style={{ padding: "8px", color: "#555", textAlign: "right" }}>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(topAnomalyRow || {})
                                                .filter(([k]) => !k.startsWith('_') && !k.startsWith('plant_id'))
                                                .slice(10, 20)
                                                .map(([k, v]) => (
                                                    <tr key={k} style={{ borderBottom: "1px solid #1a1a26" }}>
                                                        <td style={{ padding: "8px", color: "#888" }}>{FEATURE_LABELS[k] || k}</td>
                                                        <td style={{ padding: "8px", textAlign: "right", color: "#fff", fontWeight: 600 }}>{typeof v === 'number' ? v.toFixed(3) : String(v)}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SHAP TAB */}
                {activeTab === "shap" && (
                    <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
                            <div className="card">
                                <div style={{ fontSize: "11px", color: "#4cc9f0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px", textAlign: "center", fontWeight: 600 }}>
                                    Model Backend SHAP Values
                                </div>
                                <div style={{ fontSize: "10px", color: "#555", marginBottom: "14px" }}>
                                    Dynamic model inference for true causal failure features
                                </div>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={shapData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" horizontal={false} />
                                        <XAxis type="number" tick={{ fill: "#555", fontSize: 9 }} tickFormatter={v => v.toFixed(1)} label={{ value: "Feature Impact/Deviation", fill: "#444", fontSize: 9, position: "insideBottom", offset: -2 }} />
                                        <YAxis type="category" dataKey="label" tick={{ fill: "#999", fontSize: 9 }} width={130} />
                                        <Tooltip
                                            contentStyle={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", fontFamily: "inherit", fontSize: "11px", color: "#fff", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)" }}
                                            itemStyle={{ color: "#fff" }}
                                            labelStyle={{ color: "#4cc9f0", marginBottom: "4px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase" }}
                                            cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                                            formatter={(v, n, p) => [`Impact: ${v.toFixed(2)} | Raw: ${p.payload.value}`, p.payload.fullLabel]}
                                        />
                                        <Bar dataKey="deviation" radius={[0, 2, 2, 0]}>
                                            {shapData.map((d, i) => (
                                                <Cell key={i} fill={d.deviation > 2 ? "#ff2d55" : d.deviation > 1 ? "#ff9500" : "#4cc9f0"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="card">
                                <div style={{ fontSize: "11px", color: "#4cc9f0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "14px", textAlign: "center", fontWeight: 600 }}>
                                    Radar: Anomaly Profile (top 8 features)
                                </div>
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="#1e1e2e" />
                                        <PolarAngleAxis dataKey="feature" tick={{ fill: "#666", fontSize: 9 }} />
                                        <Tooltip
                                            contentStyle={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "10px", fontFamily: "inherit", fontSize: "11px", color: "#fff", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)" }}
                                            itemStyle={{ color: "#fff" }}
                                            formatter={(v, n, p) => [`Deviation: ${v.toFixed(1)}% | Val: ${p.payload.fullValue}`, "Anomaly Impact"]}
                                        />
                                        <Radar
                                            name="Deviation"
                                            dataKey="deviation"
                                            stroke="#ff2d55"
                                            fill="#ff2d55"
                                            fillOpacity={0.15}
                                            dot={{ r: 3, fill: "#ff2d55" }}
                                            activeDot={{ r: 5, fill: "#fff", stroke: "#ff2d55", strokeWidth: 2 }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Feature detail cards */}
                        <div style={{ marginTop: "20px" }}>
                            <div style={{ fontSize: "11px", color: "#4cc9f0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px", textAlign: "center", fontWeight: 600 }}>
                                Top Contributing SHAP Features
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                                {shapData.slice(0, 3).map((d, i) => (
                                    <div key={d.key} className="card" style={{ borderLeft: `3px solid ${d.deviation > 2 ? "#ff2d55" : d.deviation > 1 ? "#ff9500" : "#4cc9f0"}` }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div style={{ fontSize: "12px", color: "#ccc", fontWeight: 500 }}>{d.fullLabel}</div>
                                            <span className="badge" style={{ background: "#ff2d5522", color: "#ff2d55" }}>{d.deviation.toFixed(2)} imp</span>
                                        </div>
                                        <div style={{ fontSize: "20px", fontWeight: 700, color: d.deviation > 2 ? "#ff2d55" : d.deviation > 1 ? "#ff9500" : "#4cc9f0", marginTop: "6px" }}>
                                            {typeof d.value === "number" ? d.value.toFixed(2) : d.value}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>
                                            {d.direction === "high" ? "↑ Drives Risk UP" : "↓ Buffer"} · rank #{i + 1} impact
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* AI TAB */}
                {activeTab === "ai" && (
                    <div>
                        {!analysis && !loading && (
                            <div style={{ textAlign: "center", padding: "80px 20px", color: "#555" }}>
                                <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚡</div>
                                <div style={{ fontSize: "14px", marginBottom: "8px" }}>Run AI Diagnosis to get Gemini's report</div>
                                <div style={{ fontSize: "12px" }}>Sends backend telemetry & SHAP data directly to the Generative LLM via backend.</div>
                                <button onClick={runAIAnalysis} style={{
                                    marginTop: "20px", background: "linear-gradient(135deg, #4cc9f0, #7b2fbe)",
                                    border: "none", borderRadius: "4px", color: "#fff", padding: "12px 28px",
                                    cursor: "pointer", fontFamily: "inherit", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase"
                                }}>Run Now</button>
                            </div>
                        )}
                        {loading && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {[1, 2, 3].map(i => <div key={i} className="shimmer card" style={{ height: "80px" }} />)}
                            </div>
                        )}
                        {analysis && (
                            <div>
                                {/* Health Score + Risk */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                                    <div className="card" style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: "48px", fontWeight: 800, fontFamily: "inherit", color: analysis.healthScore < 40 ? "#ff2d55" : analysis.healthScore < 70 ? "#ff9500" : "#06d6a0" }}>
                                            {analysis.healthScore}
                                        </div>
                                        <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>Health Score / 100</div>
                                    </div>
                                    <div className="card" style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: "28px", fontWeight: 700, color: riskColor[analysis.riskLevel] || "#ff9500" }}>{analysis.riskLevel}</div>
                                        <div style={{ fontSize: "10px", color: "#666", letterSpacing: "0.1em", textTransform: "uppercase" }}>Risk Level</div>
                                    </div>
                                    <div className="card">
                                        <div style={{ fontSize: "11px", color: "#4cc9f0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px", textAlign: "center", fontWeight: 600 }}>Summary</div>
                                        <div style={{ fontSize: "12px", color: "#bbb", lineHeight: "1.6" }}>{analysis.summary}</div>
                                    </div>
                                </div>

                                {/* Top Causes */}
                                <div style={{ marginBottom: "20px" }}>
                                    <div style={{ fontSize: "12px", color: "#4cc9f0", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px", textAlign: "center", fontWeight: 600 }}>
                                        AI-Ranked Failure Causes
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {analysis.topCauses?.map(c => (
                                            <div key={c.rank} className="card" style={{ borderLeft: `3px solid ${catColor[c.category] || "#4cc9f0"}` }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                                                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                                        <span style={{ fontFamily: "inherit", fontSize: "24px", fontWeight: 800, color: "#333" }}>0{c.rank}</span>
                                                        <div>
                                                            <div style={{ fontFamily: "inherit", fontSize: "14px", fontWeight: 700, color: "#fff" }}>{c.name}</div>
                                                            <span className="badge" style={{ background: `${catColor[c.category] || "#4cc9f0"}22`, color: catColor[c.category] || "#4cc9f0" }}>{c.category}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: "right" }}>
                                                        <div style={{ fontSize: "28px", fontWeight: 700, color: catColor[c.category] || "#4cc9f0" }}>{c.importance}</div>
                                                        <div style={{ fontSize: "9px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em" }}>Importance</div>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: "12px", color: "#aaa", lineHeight: "1.6", marginTop: "8px" }}>{c.description}</div>
                                                <div style={{ fontSize: "10px", color: "#555", marginTop: "4px", fontStyle: "italic" }}>Evidence: {c.dataEvidence}</div>
                                                <div style={{ marginTop: "8px", background: "#0d0d14", borderRadius: "3px", padding: "7px 12px", fontSize: "11px", color: "#4cc9f0" }}>
                                                    → {c.action}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Critical Events */}
                                {analysis.criticalEvents?.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: "11px", color: "#ff2d55", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px", textAlign: "center", fontWeight: 600 }}>
                                            Critical Events Flagged by AI
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {analysis.criticalEvents.map((ev, i) => (
                                                <div key={i} className="card" style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "12px 16px" }}>
                                                    <span className="badge" style={{ background: ev.severity === "CRITICAL" ? "#ff2d5522" : "#ff950022", color: ev.severity === "CRITICAL" ? "#ff2d55" : "#ff9500", whiteSpace: "nowrap" }}>{ev.severity}</span>
                                                    <span style={{ fontSize: "12px", color: "#bbb" }}>{ev.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
