import { useState, useEffect } from "react";
import axios from "axios";
import { message } from "antd";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import { mapPredio } from "./predioMapper";


// ─── Constants ───────────────────────────────────────────────────────────────
const NPN_SEGMENTS = [
  { key: "municipio", label: "Municipio", pos: [0, 5] },
  { key: "zona",      label: "Zona",      pos: [5, 7] },
  { key: "sector",    label: "Sector",    pos: [7, 9] },
  { key: "comuna",    label: "Comuna",    pos: [9, 11] },
  { key: "barrio",    label: "Barrio",    pos: [11, 13] },
  { key: "manzana",   label: "Manzana",   pos: [13, 17] },
  { key: "terreno",   label: "Terreno",   pos: [17, 21] },
  { key: "condicion", label: "Cond.",     pos: [21, 22] },
  { key: "edificio",  label: "Edificio",  pos: [22, 24] },
  { key: "piso",      label: "Piso",      pos: [24, 26] },
  { key: "unidad",    label: "Unidad",    pos: [26, 30] },
];

const SEG_PALETTES = [
  { bg: "#ddeeff", text: "#0a3d7a" },
  { bg: "#d6f0e7", text: "#0a5c3e" },
  { bg: "#ece8fc", text: "#3b2d6b" },
  { bg: "#fce0d4", text: "#7a3010" },
  { bg: "#fef3d6", text: "#7c4a00" },
  { bg: "#e8f8ee", text: "#1a5c38" },
  { bg: "#f5e8fc", text: "#5c2d7a" },
  { bg: "#fce8e8", text: "#7a1010" },
  { bg: "#e8f0fc", text: "#0a2d7a" },
  { bg: "#e4fce8", text: "#1a5c1a" },
  { bg: "#fcf0e4", text: "#7a4a0a" },
];

const MODO_MAP = {
  "1|DOMINIO (TRADICION)": { label: "Dominio",   bg: "#d6f0e7", color: "#0a5c3e" },
  "2|POSESIÓN":            { label: "Posesión",  bg: "#ece8fc", color: "#3b2d6b" },
  "5|OCUPACIÓN":           { label: "Ocupación", bg: "#fce0d4", color: "#7a3010" },
};
const COND_MAP = {
  "1|NPH (0)":                  { label: "NPH",        bg: "#ddeeff", color: "#0a3d7a" },
  "12|INFORMAL (2)":            { label: "Informal",   bg: "#fef3c7", color: "#7c4a00" },
  "13|BIEN DE USO PUBLICO (3)": { label: "Uso Público",bg: "#f0fce8", color: "#2a5c0a" },
  "11|VIA (4)":                 { label: "Vía",        bg: "#f1efe8", color: "#4a4840" },
  "2|RPH":                      { label: "RPH",        bg: "#ece8fc", color: "#3b2d6b" },
  "3|Parcelacion":              { label: "Parcelación",bg: "#fce0d4", color: "#7a3010" },
};
const DEST_MAP = {
  "1|HABITACIONAL":  { label: "Habitacional", bg: "#ddeeff", color: "#0a3d7a" },
  "3|COMERCIAL":     { label: "Comercial",    bg: "#fef3c7", color: "#7c4a00" },
  "2|INDUSTRIAL":    { label: "Industrial",   bg: "#f1efe8", color: "#4a4840" },
  "24|AGRICOLA":     { label: "Agrícola",     bg: "#f0fce8", color: "#2a5c0a" },
  "25|PECUARIO":     { label: "Pecuario",     bg: "#e8f0fc", color: "#0a2d7a" },
  "30|FORESTAL":     { label: "Forestal",     bg: "#e8f8ee", color: "#1a5c38" },
};
const DOC_LABELS = {
  Cedula_Ciudadania:   "C.C.",
  Cedula_Extranjeria:  "C.E.",
  Pasaporte:           "PAS.",
  NIT:                 "NIT",
  Registro_Civil:      "R.C.",
  Tarjeta_Identidad:   "T.I.",
};
const DERECHO_COLORS = {
  Dominio:  { bg: "#d6f0e7", color: "#0a5c3e" },
  Posesion: { bg: "#ece8fc", color: "#3b2d6b" },
  Ocupacion:{ bg: "#fce0d4", color: "#7a3010" },
};
const FUENTE_LABELS = {
  Escritura_Publica:        "Escritura pública",
  Resolución_Administrativa: "Resolución adm.",
  Sentencia_Judicial:       "Sentencia judicial",
  Documento_Privado:        "Doc. privado",
  Oficio:                   "Oficio",
};
const DISP_COLORS = {
  Disponible:    { bg: "#d6f0e7", color: "#0a5c3e" },
  No_Disponible: { bg: "#fce0d4", color: "#7a3010" },
  Borrador:      { bg: "#fef3c7", color: "#7c4a00" },
};
const TIPO_UC_COLORS = {
  Convencional:     { bg: "#ddeeff", color: "#0a3d7a" },
  No_Convencional:  { bg: "#fef3c7", color: "#7c4a00" },
  Mejora:           { bg: "#ece8fc", color: "#3b2d6b" },
};
const USO_COLORS = {
  Habitacional:     { bg: "#d6f0e7", color: "#0a5c3e" },
  Comercio:         { bg: "#fef3c7", color: "#7c4a00" },
  Industrial:       { bg: "#f1efe8", color: "#4a4840" },
  Institucional:    { bg: "#ddeeff", color: "#0a3d7a" },
  Mixto:            { bg: "#ece8fc", color: "#3b2d6b" },
};

// ─── Micro-components ────────────────────────────────────────────────────────
const css = {
  badge: (bg, color) => ({
    display: "inline-block", fontSize: 11, fontWeight: 600,
    padding: "3px 10px", borderRadius: 20,
    background: bg || "#f1efe8", color: color || "#4a4840",
    letterSpacing: "0.03em", whiteSpace: "nowrap",
  }),
  sectionLabel: {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.12em", color: "#8a8880",
    margin: "0 0 10px", paddingBottom: 6,
    borderBottom: "1px solid #e8e4dc",
  },
  card: {
    background: "#fff", border: "0.5px solid #e8e4dc",
    borderRadius: 10, padding: "4px 14px", marginBottom: 14,
  },
};

function Badge({ label, bg, color }) {
  return <span style={css.badge(bg, color)}>{label}</span>;
}

function SectionLabel({ children, style = {} }) {
  return <p style={{ ...css.sectionLabel, ...style }}>{children}</p>;
}

function FieldRow({ label, children, last }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "7px 0", gap: 12,
      borderBottom: last ? "none" : "0.5px solid #eeeae2",
    }}>
      <span style={{ fontSize: 12, color: "#9a9890", minWidth: 148, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a18", textAlign: "right" }}>{children}</span>
    </div>
  );
}

function Metric({ label, value, mono, span = 1 }) {
  return (
    <div style={{
      background: "#f7f4ee", borderRadius: 8, padding: "10px 12px",
      gridColumn: span > 1 ? `span ${span}` : undefined,
    }}>
      <p style={{ fontSize: 10, color: "#9a9890", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{
        fontSize: 13, fontWeight: 700, color: "#1a1a18", margin: 0,
        fontFamily: mono ? "'Courier New', monospace" : "inherit",
        letterSpacing: mono ? "0.04em" : "normal",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value || "—"}</p>
    </div>
  );
}

// ─── Tab: FICHA ───────────────────────────────────────────────────────────────
function TabFicha({ data, canManagePredios, selectedSchema, onEdit }) {
  const [hovered, setHovered] = useState(null);
  const modo = MODO_MAP[data.modoAdquisicion] || { label: data.modoAdquisicion, bg: "#f1efe8", color: "#4a4840" };
  const cond = COND_MAP[data.condicionPredio]  || { label: data.condicionPredio,  bg: "#f1efe8", color: "#4a4840" };
  const dest = DEST_MAP[data.destinoEconomico] || { label: (data.destinoEconomico||"").split("|")[1] || data.destinoEconomico, bg: "#f1efe8", color: "#4a4840" };

  return (
    <div style={{ padding: "18px 20px 4px" }}>

      {/* NPN completo */}
      <SectionLabel>Número predial nacional</SectionLabel>
      <div style={{
        background: "#1a1a18", borderRadius: 8, padding: "9px 14px",
        marginBottom: 10, display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 10, color: "#6a6860", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>NPN</span>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700, color: "#c8e6c9", letterSpacing: "0.1em", wordBreak: "break-all" }}>
          {data.npn}
        </span>
      </div>

      {/* Segmentos NPN */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 18 }}>
        {NPN_SEGMENTS.map((seg, i) => {
          const val = (data.npn || "").substring(seg.pos[0], seg.pos[1]);
          const pal = SEG_PALETTES[i % SEG_PALETTES.length];
          const active = hovered === i;
          return (
            <div
              key={seg.key}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: active ? pal.bg : "#f0ece4",
                borderRadius: 6, padding: "7px 5px", textAlign: "center",
                border: `1.5px solid ${active ? pal.text + "44" : "transparent"}`,
                transition: "all 0.13s ease", cursor: "default",
              }}
            >
              <p style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700, color: active ? pal.text : "#1a1a18", margin: "0 0 2px", letterSpacing: "0.06em" }}>{val || "—"}</p>
              <p style={{ fontSize: 9, color: "#9a9890", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{seg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Localización */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e8e4dc", paddingBottom: 6, marginBottom: 10 }}>
        <SectionLabel style={{ borderBottom: "none", margin: 0, paddingBottom: 0 }}>Localización e identificación</SectionLabel>
        {canManagePredios && selectedSchema && (
          <button
            onClick={onEdit}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#0a5c3e",
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "background 0.15s",
            }}
            onMouseOver={e => e.currentTarget.style.background = "#f0ece4"}
            onMouseOut={e => e.currentTarget.style.background = "none"}
          >
            ✏️ Editar Ficha
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <Metric label="Departamento" value={data.departamento} />
        <Metric label="Municipio" value={data.municipio} />
        <Metric label="Círculo ORIP" value={data.circulo} mono />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
        <Metric 
          label="Matrícula inmobiliaria" 
          value={data.circulo && data.matriculaInmobiliaria ? `${data.circulo}-${data.matriculaInmobiliaria}` : (data.matriculaInmobiliaria || "—")} 
          mono 
        />
        <Metric label="Libro" value={data.libro} mono />
        <Metric label="Tomo" value={data.tomo} mono />
        <Metric label="Página" value={data.pagina} mono />
      </div>

      {/* Dirección */}
      <SectionLabel>Dirección</SectionLabel>
      <div style={css.card}>
        <FieldRow label="Tipo de dirección"><Badge label={data.tipoDireccion || "Estructurada"} bg="#ece8fc" color="#3b2d6b" /></FieldRow>
        <FieldRow label="Dirección real">{data.direccionReal || "—"}</FieldRow>
        <FieldRow label="Nombre / descripción" last>{data.direccionNombre || "—"}</FieldRow>
      </div>

      {/* Características */}
      <SectionLabel>Características</SectionLabel>
      <div style={css.card}>
        <FieldRow label="Modo de adquisición"><Badge label={modo.label || "—"} bg={modo.bg} color={modo.color} /></FieldRow>
        <FieldRow label="Condición del predio"><Badge label={cond.label || "—"} bg={cond.bg} color={cond.color} /></FieldRow>
        <FieldRow label="Destino económico" last><Badge label={dest.label || "—"} bg={dest.bg} color={dest.color} /></FieldRow>
      </div>

      {(data.totalUnidades != null || data.areaTotalTerreno != null) && (
        <>
          <SectionLabel>Datos PH / Condominio</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {data.totalUnidades  != null && <Metric label="Unidades privadas" value={data.totalUnidades} />}
            {data.numeroTorres   != null && <Metric label="Número de torres"  value={data.numeroTorres} />}
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8880", margin: "0 0 6px" }}>Áreas terreno (m²)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {data.areaTotalTerreno        != null && <Metric label="Total"   value={Number(data.areaTotalTerreno).toLocaleString("es-CO",{maximumFractionDigits:2})} />}
            {data.areaTotalTerrenoComun   != null && <Metric label="Común"   value={Number(data.areaTotalTerrenoComun).toLocaleString("es-CO",{maximumFractionDigits:2})} />}
            {data.areaTotalTerrenoPrivada != null && <Metric label="Privada" value={Number(data.areaTotalTerrenoPrivada).toLocaleString("es-CO",{maximumFractionDigits:2})} />}
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8880", margin: "0 0 6px" }}>Áreas construidas (m²)</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {data.areaTotalConstruida        != null && <Metric label="Total"   value={Number(data.areaTotalConstruida).toLocaleString("es-CO",{maximumFractionDigits:2})} />}
            {data.areaTotalConstruidaComun   != null && <Metric label="Común"   value={Number(data.areaTotalConstruidaComun).toLocaleString("es-CO",{maximumFractionDigits:2})} />}
            {data.areaTotalConstruidaPrivada != null && <Metric label="Privada" value={Number(data.areaTotalConstruidaPrivada).toLocaleString("es-CO",{maximumFractionDigits:2})} />}
          </div>
          {data.areaTotalConstruida > 0 && data.areaTotalConstruidaComun != null && data.areaTotalConstruidaPrivada != null && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: "#9a9890", textTransform: "uppercase", letterSpacing: "0.06em" }}>Común</span>
                <span style={{ fontSize: 9, color: "#9a9890", textTransform: "uppercase", letterSpacing: "0.06em" }}>Privada</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "#e8e4dc", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${(data.areaTotalConstruidaComun / data.areaTotalConstruida) * 100}%`, background: "#0a5c3e" }} />
                <div style={{ flex: 1, background: "#0a3d7a" }} />
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
                <span style={{ fontSize: 9, color: "#0a5c3e" }}>■ Común ({((data.areaTotalConstruidaComun / data.areaTotalConstruida) * 100).toFixed(1)}%)</span>
                <span style={{ fontSize: 9, color: "#0a3d7a" }}>■ Privada ({((data.areaTotalConstruidaPrivada / data.areaTotalConstruida) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

// ─── Tab: PROPIETARIOS ────────────────────────────────────────────────────────
function PropietarioCard({ p, index, canManagePredios, selectedSchema, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const docLabel  = DOC_LABELS[p.tipoDocumento] || p.tipoDocumento || "DOC";
  const derecho   = DERECHO_COLORS[p.tipoDerecho] || { bg: "#f1efe8", color: "#4a4840" };
  const fuenteLbl = FUENTE_LABELS[p.tipoFuente]  || p.tipoFuente || "—";
  const dispStyle = DISP_COLORS[p.disponibilidad] || { bg: "#f1efe8", color: "#4a4840" };

  const nombre = p.razonSocial
    ? p.razonSocial
    : [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(" ");
  const initials = p.razonSocial
    ? p.razonSocial.slice(0, 2).toUpperCase()
    : [(p.primerNombre || "")[0], (p.primerApellido || "")[0]].filter(Boolean).join("").toUpperCase() || "?";

  const avatarPalettes = [
    { bg: "#d6f0e7", color: "#0a5c3e" },
    { bg: "#ddeeff", color: "#0a3d7a" },
    { bg: "#ece8fc", color: "#3b2d6b" },
    { bg: "#fce0d4", color: "#7a3010" },
  ];
  const av = avatarPalettes[index % avatarPalettes.length];

  const fmt = (dateStr) => {
    if (!dateStr) return "—";
    try { 
      if (dateStr.includes("/")) return dateStr; // Already formatted DD/MM/YYYY
      return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }); 
    }
    catch { return dateStr; }
  };

  return (
    <div style={{
      background: "#fff", border: "0.5px solid #e8e4dc",
      borderRadius: 10, marginBottom: 10, overflow: "hidden",
    }}>
      {/* Header de la tarjeta */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: av.bg, color: av.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, flexShrink: 0, letterSpacing: "0.04em",
          }}>{initials}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: "#1a1a18", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nombre || "—"}
            </p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <Badge label={p.tipoDerecho || "—"} bg={derecho.bg} color={derecho.color} />
              {p.tipoAgrupacion && <Badge label={p.tipoAgrupacion} bg="#fef3c7" color="#7c4a00" />}
              <Badge label={p.disponibilidad || "—"} bg={dispStyle.bg} color={dispStyle.color} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 1px", fontSize: 22, fontWeight: 700, color: "#1a1a18", lineHeight: 1 }}>
                {p.derecho ?? 100}<span style={{ fontSize: 12, color: "#9a9890", fontWeight: 400 }}>%</span>
              </p>
              <p style={{ margin: 0, fontSize: 9, color: "#9a9890", textTransform: "uppercase", letterSpacing: "0.06em" }}>Derecho</p>
            </div>
            {canManagePredios && selectedSchema && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(p);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#0a5c3e",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "background 0.15s",
                }}
                onMouseOver={e => e.currentTarget.style.background = "#f0ece4"}
                onMouseOut={e => e.currentTarget.style.background = "none"}
                title="Editar propietario"
              >
                ✏️ Editar Propietario
              </button>
            )}
          </div>
        </div>

        {/* Barra derecho */}
        <div style={{ height: 3, background: "#f0ece4", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(p.derecho ?? 100, 100)}%`, background: av.color, borderRadius: 2 }} />
        </div>

        {/* Documento */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, background: "#f0ece4", color: "#6a6860",
            padding: "2px 8px", borderRadius: 4, letterSpacing: "0.06em", flexShrink: 0,
          }}>{docLabel}</span>
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700, color: "#1a1a18", letterSpacing: "0.06em" }}>
            {p.documento || "—"}
          </span>
          {p.razonSocial && (
            <span style={{ fontSize: 11, color: "#9a9890", marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.razonSocial}
            </span>
          )}
        </div>
      </div>

      {/* Fuente / título — acordeón */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px", background: "#f7f4ee",
          borderTop: "0.5px solid #e8e4dc", cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="#9a9890" strokeWidth="1.2" fill="none"/>
            <path d="M4 5h6M4 7h6M4 9h4" stroke="#9a9890" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#6a6860", letterSpacing: "0.04em" }}>
            {fuenteLbl}
            {p.escritura ? ` · No. ${p.escritura}` : ""}
          </span>
        </div>
        <span style={{ fontSize: 12, color: "#9a9890", transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </div>

      {/* Detalle fuente expandido */}
      {expanded && (
        <div style={{ padding: "12px 16px", borderTop: "0.5px solid #eeeae2", background: "#faf7f2" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
            {[
              ["Tipo fuente",       fuenteLbl],
              ["No. escritura",     p.escritura || "—"],
              ["Entidad emisora",   p.entidad   || "—"],
              ["Fecha escritura",   fmt(p.fechaEscritura)],
              ["Fecha inicio ten.", fmt(p.fecha)],
              ["Disponibilidad",    p.disponibilidad || "—"],
            ].map(([lbl, val]) => (
              <div key={lbl}>
                <p style={{ fontSize: 10, color: "#9a9890", margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{lbl}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#1a1a18", margin: 0 }}>{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabPropietarios({ propietarios = [], loading = false, canManagePredios, selectedSchema, onEdit }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "2px solid #e8e4dc", borderTopColor: "#0a5c3e",
          animation: "spin 0.8s linear infinite",
        }} />
        <span style={{ fontSize: 12, color: "#9a9890" }}>Cargando propietarios...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const total = propietarios.reduce((s, p) => s + (p.derecho ?? 100), 0);
  const totalOk = Math.abs(total - 100) < 0.01;

  // agrupar por tipo de derecho para resumen
  const byDerecho = propietarios.reduce((acc, p) => {
    const k = p.tipoDerecho || "Sin tipo";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: "18px 20px 4px" }}>

      {/* Métricas resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={{ background: "#f7f4ee", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, color: "#9a9890", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Titulares</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18", margin: 0 }}>{propietarios.length}</p>
        </div>
        <div style={{ background: "#f7f4ee", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, color: "#9a9890", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Derecho total</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: totalOk ? "#0a5c3e" : "#7a3010", margin: 0 }}>
            {total.toFixed(total % 1 === 0 ? 0 : 1)}<span style={{ fontSize: 13, fontWeight: 400, color: "#9a9890" }}>%</span>
          </p>
        </div>
        <div style={{ background: "#f7f4ee", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, color: "#9a9890", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tipos derecho</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {Object.entries(byDerecho).map(([k, n]) => {
              const d = DERECHO_COLORS[k] || { bg: "#f1efe8", color: "#4a4840" };
              return <Badge key={k} label={`${k} (${n})`} bg={d.bg} color={d.color} />;
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionLabel style={{ margin: 0 }}>Titulares registrados</SectionLabel>
        {canManagePredios && selectedSchema && (
          <button
            onClick={() => onEdit(null)}
            style={{
              background: "#0a5c3e",
              border: "none",
              cursor: "pointer",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "background 0.15s",
            }}
            onMouseOver={e => e.currentTarget.style.background = "#084931"}
            onMouseOut={e => e.currentTarget.style.background = "#0a5c3e"}
          >
            ➕ Agregar Propietario
          </button>
        )}
      </div>

      {propietarios.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9a9890", fontSize: 13 }}>
          Sin propietarios registrados
        </div>
      ) : (
        propietarios.map((p, i) => (
          <PropietarioCard 
            key={i} 
            p={p} 
            index={i} 
            canManagePredios={canManagePredios}
            selectedSchema={selectedSchema}
            onEdit={onEdit}
          />
        ))
      )}
    </div>
  );
}

// ─── Tab: CONSTRUCCIONES ─────────────────────────────────────────────────────
function ConstruccionCard({ c, index, canManagePredios, selectedSchema, onEdit }) {
  const tipoBadge = TIPO_UC_COLORS[c.tipo] || { bg: "#f1efe8", color: "#4a4840" };
  const usoBadge  = USO_COLORS[c.uso]      || { bg: "#f1efe8", color: "#4a4840" };

  const iconColors = [
    { bg: "#d6f0e7", color: "#0a5c3e" },
    { bg: "#ddeeff", color: "#0a3d7a" },
    { bg: "#ece8fc", color: "#3b2d6b" },
    { bg: "#fce0d4", color: "#7a3010" },
  ];
  const ic = iconColors[index % iconColors.length];

  // Visual: plantas como bloques apilados
  const maxPlants = Math.max(c.totalPlantas || 1, 1);
  const plantaActual = c.plantaUbicacion || 1;

  return (
    <div style={{
      background: "#fff", border: "0.5px solid #e8e4dc",
      borderRadius: 10, marginBottom: 10, overflow: "hidden",
    }}>
      {/* Cabecera */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>

          {/* Ícono edificio */}
          <div style={{
            width: 44, height: 44, borderRadius: 8, background: ic.bg,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="3" y="6" width="16" height="13" rx="1.5" stroke={ic.color} strokeWidth="1.4" fill="none"/>
              <path d="M8 19V14h6v5" stroke={ic.color} strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M11 3L3 7M11 3L19 7" stroke={ic.color} strokeWidth="1.4" strokeLinecap="round"/>
              <rect x="7" y="9" width="2.5" height="2.5" rx="0.5" fill={ic.color} opacity="0.6"/>
              <rect x="12.5" y="9" width="2.5" height="2.5" rx="0.5" fill={ic.color} opacity="0.6"/>
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: "#1a1a18" }}>
              {c.etiqueta || c.identificador || `Unidad ${index + 1}`}
            </p>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              <Badge label={c.tipo?.replace(/_/g, " ") || "—"} bg={tipoBadge.bg} color={tipoBadge.color} />
              <Badge label={c.uso || "—"} bg={usoBadge.bg} color={usoBadge.color} />
              {c.usoTradicional && (
                <Badge label={c.usoTradicional.replace(/_/g, " ")} bg="#f5e8fc" color="#5c2d7a" />
              )}
              {c.tipoPlanta && (
                <Badge label={c.tipoPlanta.replace(/_/g, " ")} bg="#e8f5e9" color="#2e7d32" />
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 1px", fontSize: 11, color: "#9a9890", textTransform: "uppercase", letterSpacing: "0.06em" }}>ID</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1a1a18", fontFamily: "'Courier New', monospace" }}>
                {c.identificador || "—"}
              </p>
            </div>
            {canManagePredios && selectedSchema && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(c);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#0a5c3e",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "background 0.15s",
                }}
                onMouseOver={e => e.currentTarget.style.background = "#f0ece4"}
                onMouseOut={e => e.currentTarget.style.background = "none"}
                title="Editar construcción"
              >
                ✏️ Editar Construcción
              </button>
            )}
          </div>
        </div>

        {/* Métricas en grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {[
            ["Plantas",    c.totalPlantas ?? "—", false],
            ["Altura (m)", c.altura != null ? `${c.altura}m` : "—", false],
            ["Planta",     c.plantaUbicacion ?? "—", false],
            ["Año constr.",c.anioConstruccion ?? "—", false],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ background: "#f7f4ee", borderRadius: 6, padding: "8px 10px" }}>
              <p style={{ fontSize: 9, color: "#9a9890", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{lbl}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a18", margin: 0 }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Visualización plantas */}
      {c.totalPlantas > 0 && (
        <div style={{
          borderTop: "0.5px solid #e8e4dc", background: "#f7f4ee",
          padding: "10px 16px", display: "flex", alignItems: "flex-end", gap: 4,
        }}>
          <span style={{ fontSize: 10, color: "#9a9890", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 6, alignSelf: "center", flexShrink: 0 }}>
            Plantas
          </span>
          {Array.from({ length: Math.min(maxPlants, 12) }).map((_, i) => {
            const plantaNum = maxPlants - i; // de arriba hacia abajo
            const isActual  = plantaNum === plantaActual;
            return (
              <div
                key={i}
                title={`Planta ${plantaNum}${isActual ? " (ubicación)" : ""}`}
                style={{
                  width: 20,
                  height: isActual ? 22 : 14,
                  borderRadius: 3,
                  background: isActual ? ic.color : ic.bg,
                  border: `1px solid ${isActual ? ic.color : "#e0dcd4"}`,
                  transition: "all 0.15s",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                {isActual && (
                  <span style={{
                    position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)",
                    fontSize: 8, color: ic.color, fontWeight: 700, whiteSpace: "nowrap",
                  }}>P{plantaNum}</span>
                )}
              </div>
            );
          })}
          {maxPlants > 12 && (
            <span style={{ fontSize: 10, color: "#9a9890", marginLeft: 2 }}>+{maxPlants - 12}</span>
          )}
        </div>
      )}
    </div>
  );
}

function TabConstrucciones({ construcciones = [], loading = false, canManagePredios, selectedSchema, onEdit }) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "2px solid #e8e4dc", borderTopColor: "#0a5c3e",
          animation: "spin 0.8s linear infinite",
        }} />
        <span style={{ fontSize: 12, color: "#9a9890" }}>Cargando construcciones...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const totalPlantas = construcciones.reduce((s, c) => s + (c.totalPlantas || 0), 0);
  const alturaMax    = construcciones.length
    ? Math.max(...construcciones.map(c => c.altura || 0))
    : 0;
  const usos = [...new Set(construcciones.map(c => c.uso).filter(Boolean))];

  return (
    <div style={{ padding: "18px 20px 4px" }}>

      {/* Métricas resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={{ background: "#f7f4ee", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, color: "#9a9890", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Unidades</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18", margin: 0 }}>{construcciones.length}</p>
        </div>
        <div style={{ background: "#f7f4ee", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, color: "#9a9890", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total plantas</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18", margin: 0 }}>{totalPlantas || "—"}</p>
        </div>
        <div style={{ background: "#f7f4ee", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontSize: 10, color: "#9a9890", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Altura máx.</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18", margin: 0 }}>
            {alturaMax > 0 ? <>{alturaMax}<span style={{ fontSize: 12, fontWeight: 400, color: "#9a9890" }}>m</span></> : "—"}
          </p>
        </div>
      </div>

      {/* Usos presentes */}
      {usos.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {usos.map(u => {
            const s = USO_COLORS[u] || { bg: "#f1efe8", color: "#4a4840" };
            return <Badge key={u} label={u} bg={s.bg} color={s.color} />;
          })}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionLabel style={{ margin: 0 }}>Unidades de construcción</SectionLabel>
        {canManagePredios && selectedSchema && (
          <button
            onClick={() => onEdit(null)}
            style={{
              background: "#0a5c3e",
              border: "none",
              cursor: "pointer",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "background 0.15s",
            }}
            onMouseOver={e => e.currentTarget.style.background = "#084931"}
            onMouseOut={e => e.currentTarget.style.background = "#0a5c3e"}
          >
            ➕ Agregar Construcción
          </button>
        )}
      </div>

      {construcciones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9a9890", fontSize: 13 }}>
          Sin construcciones registradas
        </div>
      ) : (
        construcciones.map((c, i) => (
          <ConstruccionCard 
            key={c.caracteristica ?? i} 
            c={c} 
            index={i} 
            canManagePredios={canManagePredios}
            selectedSchema={selectedSchema}
            onEdit={onEdit}
          />
        ))
      )}
    </div>
  );
}

// ─── Tab: CALIFICACIONES ─────────────────────────────────────────────────────
function RecuadroField({ label, value, isEditing, children }) {
  return (
    <div style={{
      background: "#fff",
      border: "1.5px solid #e8e4dc",
      borderRadius: 8,
      padding: "6px 10px",
      display: "flex",
      flexDirection: "column",
      gap: 2,
      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
      minHeight: 52,
      justifyContent: "center"
    }}>
      <span style={{ fontSize: 9, color: "#8a8880", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
        {label}
      </span>
      {isEditing ? (
        children
      ) : (
        <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a18", wordBreak: "break-word" }}>
          {value || "—"}
        </span>
      )}
    </div>
  );
}

function TabCalificaciones({ 
  calificaciones = [], 
  loading = false,
  canManagePredios,
  selectedSchema,
  typeOptions,
  onRefresh
}) {
  const [editingCaracteristicaId, setEditingCaracteristicaId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [calForm, setCalForm] = useState({
    tipo_calificacion: "",
    armazon: "",
    muros: "",
    cubierta: "",
    conservacion_estructura: "",
    fachada: "",
    cubrimiento_muros: "",
    piso: "",
    conservacion_acabados: "",
    tamanio_banio: "",
    enchape_banio: "",
    mobiliario_banio: "",
    conservacion_banio: "",
    tamanio_cocina: "",
    enchape_cocina: "",
    mobiliario_cocina: "",
    conservacion_cocina: "",
    cerchas_complemento_industria: "",
    altura_cerchas_superior_6m: false,
    ConvencionalNoConvencional: ""
  });

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "2px solid #e8e4dc", borderTopColor: "#0a5c3e",
          animation: "spin 0.8s linear infinite",
        }} />
        <span style={{ fontSize: 12, color: "#9a9890" }}>Cargando calificaciones...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const findId = (list, val) => {
    if (!list || !val) return "";
    const normalizedVal = val.toLowerCase().replace(/_/g, " ").trim();
    const found = list.find(opt => {
      const disp = (opt.dispname || "").toLowerCase().replace(/_/g, " ").trim();
      const ili = (opt.ilicode || "").toLowerCase().replace(/_/g, " ").trim();
      return disp.includes(normalizedVal) || ili.includes(normalizedVal) || normalizedVal.includes(ili);
    });
    return found ? String(found.t_id) : "";
  };

  const handleStartEdit = (cal) => {
    setCalForm({
      tipo_calificacion: findId(typeOptions?.cucCalificarTipo, cal.tipocalificaion),
      armazon: findId(typeOptions?.cucArmazon, cal.armazon),
      muros: findId(typeOptions?.cucMuros, cal.muros),
      cubierta: findId(typeOptions?.cucCubierta, cal.cubierta),
      conservacion_estructura: findId(typeOptions?.cucConservacion, cal.ConservacionEstructura),
      fachada: findId(typeOptions?.cucFachada, cal.Fachada),
      cubrimiento_muros: findId(typeOptions?.cucCubrimientoMuros, cal.CubrimientosMuro),
      piso: findId(typeOptions?.cucPiso, cal.Piso),
      conservacion_acabados: findId(typeOptions?.cucConservacion, cal.ConservacionAcabados),
      tamanio_banio: findId(typeOptions?.cucTamanioBanio, cal.Tamaniobanio),
      enchape_banio: findId(typeOptions?.cucEnchapeBanio, cal.EnchapeBanio),
      mobiliario_banio: findId(typeOptions?.cucMobiliarioBanio, cal.mobiliariobanio),
      conservacion_banio: findId(typeOptions?.cucConservacion, cal.ConservacionBanio),
      tamanio_cocina: findId(typeOptions?.cucTamanioCocina, cal.Tamaniococina),
      enchape_cocina: findId(typeOptions?.cucEnchapeCocina, cal.enchapecocina),
      mobiliario_cocina: findId(typeOptions?.cucMobiliarioCocina, cal.mobiliariococina),
      conservacion_cocina: findId(typeOptions?.cucConservacion, cal.ConservacionCocina),
      cerchas_complemento_industria: findId(typeOptions?.cucCerchasComplemento, cal.complementoindustrial),
      altura_cerchas_superior_6m: cal.AlturaCerchas === 1 || cal.AlturaCerchas === true,
      ConvencionalNoConvencional: cal.ConvencionalNoConvencional || "Sin Calificar"
    });
    setEditingCaracteristicaId(cal.caracteristica);
  };

  const handleCancelEdit = () => {
    setEditingCaracteristicaId(null);
  };

  const handleSave = async (caracteristicaId) => {
    if (!selectedSchema) return;
    setSavingId(caracteristicaId);
    try {
      const payload = {
        tipo_calificacion: calForm.tipo_calificacion ? parseInt(calForm.tipo_calificacion, 10) : null,
        armazon: calForm.armazon ? parseInt(calForm.armazon, 10) : null,
        muros: calForm.muros ? parseInt(calForm.muros, 10) : null,
        cubierta: calForm.cubierta ? parseInt(calForm.cubierta, 10) : null,
        conservacion_estructura: calForm.conservacion_estructura ? parseInt(calForm.conservacion_estructura, 10) : null,
        fachada: calForm.fachada ? parseInt(calForm.fachada, 10) : null,
        cubrimiento_muros: calForm.cubrimiento_muros ? parseInt(calForm.cubrimiento_muros, 10) : null,
        piso: calForm.piso ? parseInt(calForm.piso, 10) : null,
        conservacion_acabados: calForm.conservacion_acabados ? parseInt(calForm.conservacion_acabados, 10) : null,
        tamanio_banio: calForm.tamanio_banio ? parseInt(calForm.tamanio_banio, 10) : null,
        enchape_banio: calForm.enchape_banio ? parseInt(calForm.enchape_banio, 10) : null,
        mobiliario_banio: calForm.mobiliario_banio ? parseInt(calForm.mobiliario_banio, 10) : null,
        conservacion_banio: calForm.conservacion_banio ? parseInt(calForm.conservacion_banio, 10) : null,
        tamanio_cocina: calForm.tamanio_cocina ? parseInt(calForm.tamanio_cocina, 10) : null,
        enchape_cocina: calForm.enchape_cocina ? parseInt(calForm.enchape_cocina, 10) : null,
        mobiliario_cocina: calForm.mobiliario_cocina ? parseInt(calForm.mobiliario_cocina, 10) : null,
        conservacion_cocina: calForm.conservacion_cocina ? parseInt(calForm.conservacion_cocina, 10) : null,
        cerchas_complemento_industria: calForm.cerchas_complemento_industria ? parseInt(calForm.cerchas_complemento_industria, 10) : null,
        altura_cerchas_superior_6m: calForm.altura_cerchas_superior_6m,
        ConvencionalNoConvencional: calForm.ConvencionalNoConvencional
      };

      const response = await axios.put(
        `/api/predios/calificaciones/${caracteristicaId}?schema=${selectedSchema}`,
        payload
      );

      if (response.data.success) {
        message.success("Calificaciones guardadas correctamente");
        setEditingCaracteristicaId(null);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error("Error al guardar calificaciones:", error);
      message.error(error.response?.data?.message || "Error al actualizar calificaciones");
    } finally {
      setSavingId(null);
    }
  };

  const renderDropdown = (field, list) => {
    return (
      <select
        value={calForm[field]}
        onChange={e => setCalForm({ ...calForm, [field]: e.target.value })}
        style={{
          width: "100%",
          padding: "2px 4px",
          background: "#fff",
          border: "1px solid #c8c6c0",
          borderRadius: 4,
          fontSize: 12,
          color: "#1a1a18",
          outline: "none"
        }}
      >
        <option value="">Seleccionar...</option>
        {list?.map(opt => (
          <option key={opt.t_id} value={String(opt.t_id)}>
            {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div style={{ padding: "18px 20px 4px" }}>
      <SectionLabel>Detalle de Calificaciones por Unidad</SectionLabel>
      {calificaciones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9a9890", fontSize: 13 }}>
          Sin calificaciones registradas para este predio
        </div>
      ) : (
        calificaciones.map((cal, i) => {
          const initials = cal.identificador || `U-${i+1}`;
          const isConvencional = cal.ConvencionalNoConvencional === "Convencional";
          const isNoConvencional = cal.ConvencionalNoConvencional === "No Convencional";
          const isTipologia = cal.ConvencionalNoConvencional === "Tipologia";
          const isEditing = editingCaracteristicaId === cal.caracteristica;
          
          let cardTypeLabel = cal.ConvencionalNoConvencional || "Sin Calificar";
          let badgeBg = "#f1efe8";
          let badgeColor = "#4a4840";
          if (isConvencional) {
            badgeBg = "#ddeeff";
            badgeColor = "#0a3d7a";
          } else if (isNoConvencional) {
            badgeBg = "#fef3c7";
            badgeColor = "#7c4a00";
          } else if (isTipologia) {
            badgeBg = "#ece8fc";
            badgeColor = "#3b2d6b";
          }

          return (
            <div key={cal.caracteristica || i} style={{
              background: "#fff", border: "0.5px solid #e8e4dc",
              borderRadius: 10, marginBottom: 12, overflow: "hidden",
            }}>
              {/* Card Header */}
              <div style={{ padding: "12px 16px", background: "#fcfaf6", borderBottom: "0.5px solid #e8e4dc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#0a5c3e", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                  }}>{initials}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1a1a18" }}>
                      Unidad {cal.identificador || `—`}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#9a9890" }}>
                      Uso: {cal.Uso || "—"}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isConvencional && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#0a5c3e",
                      background: "#e8f5e9",
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: "0.5px solid #c8e6c9"
                    }}>
                      Puntos: {cal.Puntos || 0}
                    </span>
                  )}
                  <Badge label={cardTypeLabel} bg={badgeBg} color={badgeColor} />
                  {canManagePredios && selectedSchema && (
                    isEditing ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => handleSave(cal.caracteristica)}
                          disabled={savingId === cal.caracteristica}
                          style={{
                            background: "#0a5c3e", color: "#fff", border: "none",
                            borderRadius: 4, padding: "4px 8px", fontSize: 11,
                            fontWeight: 700, cursor: "pointer"
                          }}
                        >
                          {savingId === cal.caracteristica ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            background: "#fff", color: "#1a1a18", border: "1px solid #e8e4dc",
                            borderRadius: 4, padding: "4px 8px", fontSize: 11,
                            fontWeight: 700, cursor: "pointer"
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(cal)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#0a5c3e", fontSize: 12, fontWeight: 700,
                          padding: "4px 8px", borderRadius: 4,
                        }}
                        onMouseOver={e => e.currentTarget.style.background = "#f0ece4"}
                        onMouseOut={e => e.currentTarget.style.background = "none"}
                      >
                        ✏️ Editar
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div style={{ padding: "12px 16px" }}>
                {/* Grupo: Calificación General */}
                <h4 style={{ fontSize: 10, fontWeight: 700, color: "#8a8880", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #e8e4dc", paddingBottom: 3 }}>General</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
                  <RecuadroField label="Tipo Calificación" value={cal.tipocalificaion} isEditing={isEditing}>
                    {renderDropdown("tipo_calificacion", typeOptions?.cucCalificarTipo)}
                  </RecuadroField>
                  <RecuadroField label="Convencional / No Convencional" value={cal.ConvencionalNoConvencional} isEditing={isEditing}>
                    <select
                      value={calForm.ConvencionalNoConvencional || ""}
                      onChange={e => setCalForm({ ...calForm, ConvencionalNoConvencional: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "2px 4px",
                        background: "#fff",
                        border: "1px solid #c8c6c0",
                        borderRadius: 4,
                        fontSize: 12,
                        color: "#1a1a18",
                        outline: "none"
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Convencional">Convencional</option>
                      <option value="No Convencional">No Convencional</option>
                      <option value="Tipologia">Tipologia</option>
                    </select>
                  </RecuadroField>
                </div>

                {/* Grupo 1: Estructura */}
                <h4 style={{ fontSize: 10, fontWeight: 700, color: "#8a8880", margin: "8px 0 6px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #e8e4dc", paddingBottom: 3 }}>Estructura</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
                  <RecuadroField label="Armazón" value={cal.armazon} isEditing={isEditing}>
                    {renderDropdown("armazon", typeOptions?.cucArmazon)}
                  </RecuadroField>
                  <RecuadroField label="Muros" value={cal.muros} isEditing={isEditing}>
                    {renderDropdown("muros", typeOptions?.cucMuros)}
                  </RecuadroField>
                  <RecuadroField label="Cubierta" value={cal.cubierta} isEditing={isEditing}>
                    {renderDropdown("cubierta", typeOptions?.cucCubierta)}
                  </RecuadroField>
                  <RecuadroField label="Conservación" value={cal.ConservacionEstructura} isEditing={isEditing}>
                    {renderDropdown("conservacion_estructura", typeOptions?.cucConservacion)}
                  </RecuadroField>
                </div>

                {/* Grupo 2: Acabados */}
                <h4 style={{ fontSize: 10, fontWeight: 700, color: "#8a8880", margin: "8px 0 6px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #e8e4dc", paddingBottom: 3 }}>Acabados</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
                  <RecuadroField label="Fachada" value={cal.Fachada} isEditing={isEditing}>
                    {renderDropdown("fachada", typeOptions?.cucFachada)}
                  </RecuadroField>
                  <RecuadroField label="Cubrimientos" value={cal.CubrimientosMuro} isEditing={isEditing}>
                    {renderDropdown("cubrimiento_muros", typeOptions?.cucCubrimientoMuros)}
                  </RecuadroField>
                  <RecuadroField label="Piso" value={cal.Piso} isEditing={isEditing}>
                    {renderDropdown("piso", typeOptions?.cucPiso)}
                  </RecuadroField>
                  <RecuadroField label="Conservación" value={cal.ConservacionAcabados} isEditing={isEditing}>
                    {renderDropdown("conservacion_acabados", typeOptions?.cucConservacion)}
                  </RecuadroField>
                </div>

                {/* Grupo 3: Baños */}
                <h4 style={{ fontSize: 10, fontWeight: 700, color: "#8a8880", margin: "8px 0 6px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #e8e4dc", paddingBottom: 3 }}>Baños</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
                  <RecuadroField label="Tamaño" value={cal.Tamaniobanio} isEditing={isEditing}>
                    {renderDropdown("tamanio_banio", typeOptions?.cucTamanioBanio)}
                  </RecuadroField>
                  <RecuadroField label="Enchape" value={cal.EnchapeBanio} isEditing={isEditing}>
                    {renderDropdown("enchape_banio", typeOptions?.cucEnchapeBanio)}
                  </RecuadroField>
                  <RecuadroField label="Mobiliario" value={cal.mobiliariobanio} isEditing={isEditing}>
                    {renderDropdown("mobiliario_banio", typeOptions?.cucMobiliarioBanio)}
                  </RecuadroField>
                  <RecuadroField label="Conservación" value={cal.ConservacionBanio} isEditing={isEditing}>
                    {renderDropdown("conservacion_banio", typeOptions?.cucConservacion)}
                  </RecuadroField>
                </div>

                {/* Grupo 4: Cocina */}
                <h4 style={{ fontSize: 10, fontWeight: 700, color: "#8a8880", margin: "8px 0 6px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #e8e4dc", paddingBottom: 3 }}>Cocina</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 12 }}>
                  <RecuadroField label="Tamaño" value={cal.Tamaniococina} isEditing={isEditing}>
                    {renderDropdown("tamanio_cocina", typeOptions?.cucTamanioCocina)}
                  </RecuadroField>
                  <RecuadroField label="Enchape" value={cal.enchapecocina} isEditing={isEditing}>
                    {renderDropdown("enchape_cocina", typeOptions?.cucEnchapeCocina)}
                  </RecuadroField>
                  <RecuadroField label="Mobiliario" value={cal.mobiliariococina} isEditing={isEditing}>
                    {renderDropdown("mobiliario_cocina", typeOptions?.cucMobiliarioCocina)}
                  </RecuadroField>
                  <RecuadroField label="Conservación" value={cal.ConservacionCocina} isEditing={isEditing}>
                    {renderDropdown("conservacion_cocina", typeOptions?.cucConservacion)}
                  </RecuadroField>
                </div>

                {/* Grupo 5: Adicionales / Industrial */}
                {(cal.complementoindustrial || cal.AlturaCerchas || isEditing) && (
                  <>
                    <h4 style={{ fontSize: 10, fontWeight: 700, color: "#8a8880", margin: "8px 0 6px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "0.5px solid #e8e4dc", paddingBottom: 3 }}>Adicionales (Industrial)</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                      <RecuadroField label="Complemento" value={cal.complementoindustrial} isEditing={isEditing}>
                        {renderDropdown("cerchas_complemento_industria", typeOptions?.cucCerchasComplemento)}
                      </RecuadroField>
                      <RecuadroField label="Altura Cerchas > 6m" value={cal.AlturaCerchas === 1 ? "Sí" : "No"} isEditing={isEditing}>
                        <select
                          value={calForm.altura_cerchas_superior_6m ? "true" : "false"}
                          onChange={e => setCalForm({ ...calForm, altura_cerchas_superior_6m: e.target.value === "true" })}
                          style={{
                            width: "100%",
                            padding: "2px 4px",
                            background: "#fff",
                            border: "1px solid #c8c6c0",
                            borderRadius: 4,
                            fontSize: 12,
                            color: "#1a1a18",
                            outline: "none"
                          }}
                        >
                          <option value="false">No</option>
                          <option value="true">Sí</option>
                        </select>
                      </RecuadroField>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Component: ChangeView ──────────────────────────────────────────────────
function ChangeView({ geometry, fallbackGeometries = [] }) {
  const map = useMap();
  useEffect(() => {
    if (geometry) {
      try {
        const layer = L.geoJSON(geometry);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 21 });
          return;
        }
      } catch (err) {
        console.error("Error al ajustar vista del mapa:", err);
      }
    }

    // Zoom fallback to the first available adjacent geometry if current has none
    if (fallbackGeometries && fallbackGeometries.length > 0) {
      for (const fg of fallbackGeometries) {
        if (fg) {
          try {
            const layer = L.geoJSON(fg);
            const bounds = layer.getBounds();
            if (bounds.isValid()) {
              map.fitBounds(bounds, { padding: [40, 40], maxZoom: 19 });
              break;
            }
          } catch (err) {
            console.error("Error al ajustar vista del mapa con geometría colindante:", err);
          }
        }
      }
    }
  }, [geometry, fallbackGeometries, map]);
  return null;
}

// ─── Tab: UBICACION ──────────────────────────────────────────────────────────
function TabUbicacion({ predio, allPredios = [] }) {
  const [showBaseMap, setShowBaseMap] = useState(true);
  const hasGeom = predio.geometry && 
                  predio.geometry.coordinates && 
                  predio.geometry.coordinates.length > 0;

  const defaultCenter = [4.570868, -74.297333];
  const defaultZoom = 5;

  const geojsonStyle = {
    color: "#0a5c3e",
    weight: 3.5,
    opacity: 0.95,
    fillColor: "#d6f0e7",
    fillOpacity: 0.45,
  };

  const otherGeojsonStyle = {
    color: "#6c757d",
    weight: 1.5,
    opacity: 0.6,
    fillColor: "#ced4da",
    fillOpacity: 0.25,
  };

  const constructionStyle = {
    color: "#a53d0a",
    weight: 2,
    opacity: 0.9,
    fillColor: "#fce0d4",
    fillOpacity: 0.65,
  };

  // Filter other predios that have geometries
  const otherPrediosWithGeom = (allPredios || [])
    .filter(p => {
      const isCurrent = (p.id || p.t_id) === (predio.id || predio.t_id) || (p.npn && p.npn === predio.npn);
      return !isCurrent;
    })
    .map(p => {
      return p.geometry ? p : { ...p, ...mapPredio(p) };
    })
    .filter(p => p.geometry && p.geometry.coordinates && p.geometry.coordinates.length > 0);

  return (
    <div style={{ padding: "18px 20px 4px", display: "flex", flexDirection: "column", minHeight: 500 }}>
      <SectionLabel>Ubicación Geográfica del Predio</SectionLabel>
      
      {!hasGeom && (
        <div style={{
          background: "#fff9db",
          border: "1px solid #ffe066",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 12, color: "#856404", fontWeight: 600 }}>
            Este predio no cuenta con información de linderos o geometría espacial registrada.
          </span>
        </div>
      )}

      <div style={{ 
        width: "100%", 
        height: 520, 
        borderRadius: 12, 
        overflow: "hidden", 
        border: "1.5px solid #e8e4dc",
        position: "relative",
        boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
      }}>
        {/* Botón para activar/desactivar el mapa base */}
        <button
          onClick={() => setShowBaseMap(v => !v)}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1000,
            background: "#fff",
            border: "1.5px solid #ccc",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: "bold",
            color: "#333",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            outline: "none",
            transition: "all 0.15s ease-in-out"
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = "#f4f4f4";
            e.currentTarget.style.borderColor = "#999";
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.borderColor = "#ccc";
          }}
        >
          🗺️ {showBaseMap ? "Ocultar Calles y Nombres" : "Mostrar Calles y Nombres"}
        </button>

        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          maxZoom={22}
          style={{ height: "100%", width: "100%", zIndex: 1, background: "#f8f9fa" }}
        >
          {showBaseMap && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={22}
              maxNativeZoom={19}
            />
          )}

          {/* Render adjacent properties */}
          {otherPrediosWithGeom.map((op, index) => (
            <GeoJSON
              key={`other-predio-${op.id || op.t_id || index}`}
              data={op.geometry}
              style={otherGeojsonStyle}
              onEachFeature={(feature, layer) => {
                layer.bindPopup(`
                  <div style="font-family: inherit; font-size: 12px; color: #1a1a18; padding: 4px;">
                    <strong style="color: #6c757d; font-size: 13px;">Predio Colindante</strong><br/>
                    <span style="color: #6a6860; font-size: 11px;">NPN:</span> <code style="font-weight: 700; color: #1a1a18;">${op.npn || 'Sin NPN'}</code><br/>
                    <span style="color: #6a6860; font-size: 11px;">Ficha:</span> <code style="font-weight: 700; color: #1a1a18;">${op.espacio_de_nombres || 'Sin Ficha'}</code>
                  </div>
                `);
              }}
            />
          ))}

          {hasGeom && (
            <>
              {/* Selected highlighted property */}
              <GeoJSON 
                data={predio.geometry} 
                style={geojsonStyle}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(`
                    <div style="font-family: inherit; font-size: 12px; color: #1a1a18; padding: 4px;">
                      <strong style="color: #0a5c3e; font-size: 13px;">Linderos del Terreno (Detalle)</strong><br/>
                      <span style="color: #6a6860; font-size: 11px;">NPN:</span> <code style="font-weight: 700; color: #1a1a18;">${predio.npn || 'Sin NPN'}</code><br/>
                      <span style="color: #6a6860; font-size: 11px;">Ficha:</span> <code style="font-weight: 700; color: #1a1a18;">${predio.espacio_de_nombres || 'Sin Ficha'}</code>
                    </div>
                  `);
                }}
              />
              {predio.constructionGeometries && predio.constructionGeometries.map((c, i) => (
                <GeoJSON
                  key={`const-${c.t_id || i}`}
                  data={c.geometry}
                  style={constructionStyle}
                  onEachFeature={(feature, layer) => {
                    layer.bindPopup(`
                      <div style="font-family: inherit; font-size: 12px; color: #1a1a18; padding: 4px;">
                        <strong style="color: #a53d0a; font-size: 13px;">Área Construida</strong><br/>
                        <span style="color: #6a6860; font-size: 11px;">Identificador:</span> <code style="font-weight: 700; color: #1a1a18;">${c.etiqueta || c.local_id || `Unidad ${i+1}`}</code>
                      </div>
                    `);
                  }}
                />
              ))}
            </>
          )}

          <ChangeView 
            geometry={predio.geometry} 
            fallbackGeometries={otherPrediosWithGeom.map(op => op.geometry)}
          />
        </MapContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12, marginBottom: 10 }}>
        <Metric label="Tipo Geometría" value={hasGeom ? predio.geometry.type : "Ninguna"} />
        <Metric label="Construcciones Mapeadas" value={predio.constructionGeometries ? predio.constructionGeometries.length : 0} />
        <Metric label="Sistema Ref." value={hasGeom ? "WGS 84 (EPSG:4326)" : "—"} />
      </div>
    </div>
  );
}

// ─── Tabs config ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "ficha",          label: "Ficha" },
  { id: "propietarios",   label: "Propietarios" },
  { id: "construcciones", label: "Construcciones" },
  { id: "calificaciones", label: "Calificaciones" },
  { id: "ubicacion",      label: "Ubicación" },
];

export default function PredioModal({ 
  predio, 
  propietarios = [], 
  construcciones = [], 
  calificaciones = [],
  onClose,
  canManagePredios,
  handleEditPredio,
  handleDeletePredio,
  loadingPropietarios = false,
  loadingConstrucciones = false,
  loadingCalificaciones = false,
  typeOptions,
  selectedSchema,
  onRefresh,
  allPredios = []
}) {
  const [activeTab, setActiveTab] = useState("ficha");
  const [allGeometries, setAllGeometries] = useState([]);
  const [loadingAllGeometries, setLoadingAllGeometries] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchAllGeometries = async () => {
      try {
        setLoadingAllGeometries(true);
        const params = { page: 1, limit: 5000 };
        if (selectedSchema) {
          params.schema_name = selectedSchema;
        }
        const response = await axios.get('/api/predios', { params });
        if (response.data.success && active) {
          const fetchedPredios = response.data.data.predios || [];
          setAllGeometries(fetchedPredios);
        }
      } catch (err) {
        console.error('Error fetching all geometries for map:', err);
      } finally {
        if (active) setLoadingAllGeometries(false);
      }
    };

    fetchAllGeometries();
    return () => {
      active = false;
    };
  }, [selectedSchema]);

  const modo = MODO_MAP[predio.modoAdquisicion] || { label: predio.modoAdquisicion, bg: "#f1efe8", color: "#4a4840" };
  const cond = COND_MAP[predio.condicionPredio]  || { label: predio.condicionPredio,  bg: "#f1efe8", color: "#4a4840" };

  // Estados de edición de Ficha
  const [editingFicha, setEditingFicha] = useState(false);
  const [fichaForm, setFichaForm] = useState({
    numero_predial_nacional: "",
    matricula_inmobiliaria: "",
    espacio_de_nombres: "",
    departamento: "",
    municipio: "",
    codigo_orip: "",
    nombre: "",
    condicion_predio: "",
    tipo_predio: "",
    uso_predio: "",
  });

  // Estados de edición de propietarios
  const [editingPropietario, setEditingPropietario] = useState(null);
  const [propForm, setPropForm] = useState({
    primerNombre: "",
    segundoNombre: "",
    primerApellido: "",
    segundoApellido: "",
    razonSocial: "",
    documento: "",
    tipoDocumento: "",
    tipoDerecho: "",
    participacion: "",
    escritura: "",
    entidad: "",
    fechaEscritura: "",
    tipoFuente: "",
    disponibilidad: "",
  });

  const selectedDocTypeOpt = typeOptions?.documentoTypes?.find(opt => String(opt.t_id) === String(propForm.tipoDocumento));
  const isFormNIT = selectedDocTypeOpt && selectedDocTypeOpt.ilicode === 'NIT';

  // Estados de edición de construcciones
  const [editingConstruccion, setEditingConstruccion] = useState(null);
  const [constForm, setConstForm] = useState({
    identificador: "",
    totalPlantas: "",
    anioConstruccion: "",
    altura: "",
    plantaUbicacion: "",
    etiqueta: "",
    tipoUnidadConstruccion: "",
    uso: "",
    tipoPlanta: "",
    usosTradicionalesCulturales: "",
    areaConstruida: "0",
  });

  // Handlers para iniciar edición
  const handleStartEditFicha = () => {
    const condClean = (predio.condicionPredio || "").split("|")[1] || predio.condicionPredio || "";
    const destClean = (predio.destinoEconomico || "").split("|")[1] || predio.destinoEconomico || "";
    const tipoClean = predio.tipo || "";

    const defaultCondOpt = typeOptions?.condiciones?.find(
      opt => opt.ilicode === condClean || opt.dispname === condClean || (predio.condicionPredio && opt.ilicode === predio.condicionPredio.split("|")[0])
    );
    const defaultDestOpt = typeOptions?.destinaciones?.find(
      opt => opt.ilicode.toLowerCase() === destClean.toLowerCase() || opt.dispname.toLowerCase() === destClean.toLowerCase() || (predio.destinoEconomico && opt.ilicode === predio.destinoEconomico.split("|")[0])
    );
    const defaultTipoOpt = typeOptions?.tipos?.find(
      opt => opt.ilicode === tipoClean || opt.dispname === tipoClean
    );

    setFichaForm({
      numero_predial_nacional: predio.npn || "",
      matricula_inmobiliaria: predio.matriculaInmobiliaria || "",
      espacio_de_nombres: predio.espacio_de_nombres || "",
      departamento: predio.departamento || "",
      municipio: predio.municipio || "",
      codigo_orip: predio.circulo || "",
      nombre: predio.direccionNombre || "",
      condicion_predio: defaultCondOpt ? String(defaultCondOpt.t_id) : "",
      tipo_predio: defaultTipoOpt ? String(defaultTipoOpt.t_id) : "",
      uso_predio: defaultDestOpt ? String(defaultDestOpt.t_id) : "",
    });
    setEditingFicha(true);
  };

  const handleStartEditPropietario = (p) => {
    if (!p) {
      setPropForm({
        primerNombre: "",
        segundoNombre: "",
        primerApellido: "",
        segundoApellido: "",
        razonSocial: "",
        documento: "",
        tipoDocumento: typeOptions?.documentoTypes?.[0] ? String(typeOptions.documentoTypes[0].t_id) : "",
        tipoDerecho: typeOptions?.derechoTypes?.[0] ? String(typeOptions.derechoTypes[0].t_id) : "",
        participacion: "100",
        escritura: "",
        entidad: "",
        fechaEscritura: "",
        tipoFuente: typeOptions?.fuenteTypes?.[0] ? String(typeOptions.fuenteTypes[0].t_id) : "",
        disponibilidad: typeOptions?.disponibilidadTypes?.find(o => o.ilicode === 'Disponible')?.t_id 
          ? String(typeOptions.disponibilidadTypes.find(o => o.ilicode === 'Disponible').t_id) 
          : (typeOptions?.disponibilidadTypes?.[0] ? String(typeOptions.disponibilidadTypes[0].t_id) : ""),
      });
      setEditingPropietario({ isNew: true });
      return;
    }
    const defaultDocTypeOpt = typeOptions?.documentoTypes?.find(
      opt => opt.ilicode === p.tipoDocumento || opt.dispname === p.tipoDocumento
    );
    const defaultDerechoOpt = typeOptions?.derechoTypes?.find(
      opt => opt.ilicode === p.tipoDerecho || opt.dispname === p.tipoDerecho
    );
    const defaultFuenteOpt = typeOptions?.fuenteTypes?.find(
      opt => opt.ilicode === p.tipoFuente || opt.dispname === p.tipoFuente
    );
    const defaultDispOpt = typeOptions?.disponibilidadTypes?.find(
      opt => opt.ilicode === p.disponibilidad || opt.dispname === p.disponibilidad
    );

    let formattedFechaEscritura = "";
    if (p.fechaEscritura) {
      if (p.fechaEscritura.includes("/")) {
        const parts = p.fechaEscritura.split("/");
        if (parts.length === 3) {
          formattedFechaEscritura = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else {
        try {
          formattedFechaEscritura = new Date(p.fechaEscritura).toISOString().split('T')[0];
        } catch (e) {
          formattedFechaEscritura = p.fechaEscritura;
        }
      }
    }

    const isNIT = defaultDocTypeOpt && defaultDocTypeOpt.ilicode === 'NIT';

    let rSocial = p.razonSocial || "";
    if (isNIT && (!rSocial || rSocial.trim() === "")) {
      const nameParts = [
        p.primerNombre,
        p.segundoNombre,
        p.primerApellido,
        p.segundoApellido
      ].filter(part => part && part.trim() !== "");
      rSocial = nameParts.join(" ");
    }

    setPropForm({
      primerNombre: isNIT ? "" : (p.primerNombre || ""),
      segundoNombre: isNIT ? "" : (p.segundoNombre || ""),
      primerApellido: isNIT ? "" : (p.primerApellido || ""),
      segundoApellido: isNIT ? "" : (p.segundoApellido || ""),
      razonSocial: rSocial,
      documento: p.documento || "",
      tipoDocumento: defaultDocTypeOpt ? String(defaultDocTypeOpt.t_id) : "",
      tipoDerecho: defaultDerechoOpt ? String(defaultDerechoOpt.t_id) : "",
      participacion: p.derecho != null ? String(p.derecho) : "100",
      escritura: p.escritura || "",
      entidad: p.entidad || "",
      fechaEscritura: formattedFechaEscritura,
      tipoFuente: defaultFuenteOpt ? String(defaultFuenteOpt.t_id) : "",
      disponibilidad: defaultDispOpt ? String(defaultDispOpt.t_id) : "",
    });
    setEditingPropietario(p);
  };

  const handleStartEditConstruccion = (c) => {
    if (!c) {
      setConstForm({
        identificador: `UC-${construcciones.length + 1}`,
        totalPlantas: "1",
        anioConstruccion: String(new Date().getFullYear()),
        altura: "3",
        plantaUbicacion: "1",
        etiqueta: `Unidad ${construcciones.length + 1}`,
        tipoUnidadConstruccion: typeOptions?.ucTipos?.[0] ? String(typeOptions.ucTipos[0].t_id) : "",
        uso: typeOptions?.ucUsos?.[0] ? String(typeOptions.ucUsos[0].t_id) : "",
        tipoPlanta: typeOptions?.ucPlantas?.[0] ? String(typeOptions.ucPlantas[0].t_id) : "",
        usosTradicionalesCulturales: typeOptions?.ucTradicionales?.[0] ? String(typeOptions.ucTradicionales[0].t_id) : "",
        areaConstruida: "0",
      });
      setEditingConstruccion({ isNew: true });
      return;
    }

    const defaultUcTipoOpt = typeOptions?.ucTipos?.find(
      opt => opt.ilicode === c.tipo || opt.dispname === c.tipo
    );
    const defaultUcUsoOpt = typeOptions?.ucUsos?.find(
      opt => opt.ilicode === c.uso || opt.dispname === c.uso
    );
    const defaultUcPlantaOpt = typeOptions?.ucPlantas?.find(
      opt => opt.ilicode === c.tipoPlanta || opt.dispname === c.tipoPlanta
    );
    const defaultUcTradOpt = typeOptions?.ucTradicionales?.find(
      opt => opt.ilicode === c.usoTradicional || opt.dispname === c.usoTradicional
    );

    setConstForm({
      identificador: c.identificador || "",
      totalPlantas: c.totalPlantas != null ? String(c.totalPlantas) : "",
      anioConstruccion: c.anioConstruccion != null ? String(c.anioConstruccion) : "",
      altura: c.altura != null ? String(c.altura) : "",
      plantaUbicacion: c.plantaUbicacion != null ? String(c.plantaUbicacion) : "",
      etiqueta: c.etiqueta || "",
      tipoUnidadConstruccion: defaultUcTipoOpt ? String(defaultUcTipoOpt.t_id) : "",
      uso: defaultUcUsoOpt ? String(defaultUcUsoOpt.t_id) : "",
      tipoPlanta: defaultUcPlantaOpt ? String(defaultUcPlantaOpt.t_id) : "",
      usosTradicionalesCulturales: defaultUcTradOpt ? String(defaultUcTradOpt.t_id) : "",
      areaConstruida: c.areaConstruida != null ? String(c.areaConstruida) : "0",
    });
    setEditingConstruccion(c);
  };

  // Handlers para guardar cambios (Submit)
  const handleSavePropietario = async (e) => {
    e.preventDefault();
    if (!editingPropietario || !selectedSchema) return;

    try {
      const docTypeOpt = typeOptions?.documentoTypes?.find(opt => String(opt.t_id) === String(propForm.tipoDocumento));
      const isNIT = docTypeOpt && docTypeOpt.ilicode === 'NIT';

      // Validar que el documento no sea '0' o compuesto solo de ceros
      if (propForm.documento && /^0+$/.test(propForm.documento.trim())) {
        message.error("El número de documento de identidad no puede ser cero (0).");
        return;
      }

      // Validar la suma de participaciones en el frontend
      const newPart = propForm.participacion ? parseFloat(propForm.participacion) : 0;
      const otherOwners = (propietarios || []).filter(p => {
        if (editingPropietario && !editingPropietario.isNew) {
          return p.rrr !== editingPropietario.rrr;
        }
        return true;
      });
      const otherSum = otherOwners.reduce((sum, p) => sum + (parseFloat(p.derecho) || 0), 0);

      const oldPart = (editingPropietario && !editingPropietario.isNew) 
        ? (parseFloat(editingPropietario.derecho) || 0) 
        : 100;

      if (otherSum + newPart > 100.01 && !(editingPropietario && !editingPropietario.isNew && newPart < oldPart)) {
        message.error(`La suma de participaciones excede el 100%. Las participaciones de los otros propietarios suman ${otherSum.toFixed(2)}%, e intentas asignar ${newPart.toFixed(2)}% (Total: ${(otherSum + newPart).toFixed(2)}%).`);
        return;
      }

      const payload = {
        documento: propForm.documento || null,
        primer_nombre: isNIT ? null : (propForm.primerNombre || null),
        segundo_nombre: isNIT ? null : (propForm.segundoNombre || null),
        primer_apellido: isNIT ? null : (propForm.primerApellido || null),
        segundo_apellido: isNIT ? null : (propForm.segundoApellido || null),
        razon_social: propForm.razonSocial || null,
        tipo_documento: propForm.tipoDocumento ? parseInt(propForm.tipoDocumento, 10) : null,
        tipo_derecho: propForm.tipoDerecho ? parseInt(propForm.tipoDerecho, 10) : null,
        participacion: propForm.participacion ? parseFloat(propForm.participacion) : null,
        escritura: propForm.escritura || null,
        entidad: propForm.entidad || null,
        fecha_escritura: propForm.fechaEscritura || null,
        tipo_fuente: propForm.tipoFuente ? parseInt(propForm.tipoFuente, 10) : null,
        disponibilidad: propForm.disponibilidad ? parseInt(propForm.disponibilidad, 10) : null,
      };

      if (editingPropietario.isNew) {
        payload.predio_id = predio.id || predio.t_id;
        const response = await axios.post(
          `/api/propietarios?schema_name=${selectedSchema}`,
          payload
        );
        if (response.data.success) {
          message.success("Propietario agregado exitosamente");
          setEditingPropietario(null);
          if (onRefresh) onRefresh();
        }
      } else {
        const rrr = editingPropietario.rrr;
        if (!rrr) {
          message.error("No se pudo identificar el RRR del propietario");
          return;
        }
        payload.current_documento = editingPropietario.documento || null;
        const response = await axios.put(
          `/api/propietarios/${rrr}?schema_name=${selectedSchema}`,
          payload
        );
        if (response.data.success) {
          message.success("Propietario actualizado exitosamente");
          setEditingPropietario(null);
          if (onRefresh) onRefresh();
        }
      }
    } catch (error) {
      console.error("Error al guardar propietario:", error);
      message.error(error.response?.data?.message || "Error al guardar el propietario");
    }
  };

  const handleSaveConstruccion = async (e) => {
    e.preventDefault();
    if (!editingConstruccion || !selectedSchema) return;

    try {
      const payload = {
        identificador: constForm.identificador || null,
        total_plantas: constForm.totalPlantas ? parseInt(constForm.totalPlantas, 10) : 1,
        anio_construccion: constForm.anioConstruccion ? parseInt(constForm.anioConstruccion, 10) : new Date().getFullYear(),
        altura: constForm.altura ? parseFloat(constForm.altura) : 0,
        planta_ubicacion: constForm.plantaUbicacion ? parseInt(constForm.plantaUbicacion, 10) : 1,
        etiqueta: constForm.etiqueta || null,
        tipo_unidad_construccion: constForm.tipoUnidadConstruccion ? parseInt(constForm.tipoUnidadConstruccion, 10) : null,
        uso: constForm.uso ? parseInt(constForm.uso, 10) : null,
        tipo_planta: constForm.tipoPlanta ? parseInt(constForm.tipoPlanta, 10) : null,
        usos_tradicionales_culturales: constForm.usosTradicionalesCulturales ? parseInt(constForm.usosTradicionalesCulturales, 10) : null,
        area_construida: constForm.areaConstruida ? parseFloat(constForm.areaConstruida) : 0,
      };

      if (editingConstruccion.isNew) {
        payload.predio_id = predio.id || predio.t_id;
        const response = await axios.post(
          `/api/predios/construcciones?schema=${selectedSchema}`,
          payload
        );
        if (response.data.success) {
          message.success("Construcción agregada exitosamente");
          setEditingConstruccion(null);
          if (onRefresh) onRefresh();
        }
      } else {
        const caracteristicaId = editingConstruccion.caracteristica;
        if (!caracteristicaId) {
          message.error("No se pudo identificar la característica de la construcción");
          return;
        }
        const response = await axios.put(
          `/api/predios/construcciones/${caracteristicaId}?schema=${selectedSchema}`,
          payload
        );
        if (response.data.success) {
          message.success("Construcción actualizada exitosamente");
          setEditingConstruccion(null);
          if (onRefresh) onRefresh();
        }
      }
    } catch (error) {
      console.error("Error al guardar construcción:", error);
      message.error(error.response?.data?.message || "Error al guardar la construcción");
    }
  };

  const handleSaveFicha = async (e) => {
    e.preventDefault();
    if (!selectedSchema) return;
    const predioId = predio.t_id || predio.id;
    if (!predioId || predioId === 'undefined') {
      message.error("ID del predio no válido o no definido");
      return;
    }

    let matVal = fichaForm.matricula_inmobiliaria;
    if (matVal !== "" && matVal !== null) {
      const num = parseInt(matVal, 10);
      if (isNaN(num) || num < 0 || num > 2147483647) {
        message.error("Matrícula Inmobiliaria debe ser un número entero positivo válido (máx 2,147,483,647)");
        return;
      }
      matVal = num;
    } else {
      matVal = null;
    }

    try {
      const payload = {
        numero_predial_nacional: fichaForm.numero_predial_nacional || null,
        matricula_inmobiliaria: matVal,
        espacio_de_nombres: fichaForm.espacio_de_nombres || null,
        departamento: fichaForm.departamento || null,
        municipio: fichaForm.municipio || null,
        codigo_orip: (fichaForm.codigo_orip && ['01', '1', '001'].includes(String(fichaForm.codigo_orip).trim())) ? '801' : (fichaForm.codigo_orip || null),
        nombre: fichaForm.nombre || null,
        condicion_predio: fichaForm.condicion_predio ? parseInt(fichaForm.condicion_predio, 10) : null,
        tipo_predio: fichaForm.tipo_predio ? parseInt(fichaForm.tipo_predio, 10) : null,
        uso_predio: fichaForm.uso_predio ? parseInt(fichaForm.uso_predio, 10) : null,
      };

      const response = await axios.put(
        `/api/predios/${predioId}?schema=${selectedSchema}`,
        payload
      );

      if (response.data.success !== false) {
        message.success("Ficha del predio actualizada exitosamente");
        setEditingFicha(false);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error("Error al actualizar la ficha del predio:", error);
      message.error(error.response?.data?.message || "Error al actualizar la ficha");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(10,10,8,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    }}
      onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div style={{
        background: "#faf7f2",
        borderRadius: 14,
        width: "90%", maxWidth: 1200,
        maxHeight: "95vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* Modal header */}
        <div style={{ background: "#1a1a18", padding: "16px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6a6860" }}>Ficha catastral</p>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f5f1e8", letterSpacing: "-0.01em" }}>
                {predio.direccionReal || predio.npn}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8a8880" }}>{predio.municipio}{predio.departamento ? `, ${predio.departamento}` : ""}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Badge label={modo.label || "—"} bg="#2a3a2e" color="#7fe0b0" />
                <Badge label={cond.label || "—"}  bg="#1e2e4a" color="#7eb8f0" />
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#8a8880", fontSize: 18, padding: "0 0 0 8px",
                    lineHeight: 1, flexShrink: 0,
                  }}
                  aria-label="Cerrar"
                >✕</button>
              )}
            </div>
          </div>

          {/* NPN strip */}
          <div style={{
            background: "#252522", borderRadius: "6px 6px 0 0",
            padding: "6px 12px", marginBottom: 0,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 9, color: "#6a6860", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>NPN</span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 700, color: "#c8e6c9", letterSpacing: "0.1em", wordBreak: "break-all" }}>
              {predio.npn}
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: activeTab === tab.id ? "#faf7f2" : "transparent",
                  border: "none", cursor: "pointer",
                  padding: "10px 22px",
                  fontSize: 13, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: activeTab === tab.id ? "#1a1a18" : "#8a8880",
                  borderRadius: "6px 6px 0 0",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
                {tab.id === "propietarios" && propietarios.length > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: 10, fontWeight: 700,
                    background: activeTab === tab.id ? "#1a1a18" : "#3a3a38",
                    color: activeTab === tab.id ? "#faf7f2" : "#8a8880",
                    padding: "1px 6px", borderRadius: 10,
                  }}>{propietarios.length}</span>
                )}
                {tab.id === "construcciones" && construcciones.length > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: 10, fontWeight: 700,
                    background: activeTab === tab.id ? "#1a1a18" : "#3a3a38",
                    color: activeTab === tab.id ? "#faf7f2" : "#8a8880",
                    padding: "1px 6px", borderRadius: 10,
                  }}>{construcciones.length}</span>
                )}
                {tab.id === "calificaciones" && calificaciones.length > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: 10, fontWeight: 700,
                    background: activeTab === tab.id ? "#1a1a18" : "#3a3a38",
                    color: activeTab === tab.id ? "#faf7f2" : "#8a8880",
                    padding: "1px 6px", borderRadius: 10,
                  }}>{calificaciones.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {activeTab === "ficha"          && (
            <TabFicha 
              data={predio} 
              canManagePredios={canManagePredios}
              selectedSchema={selectedSchema}
              onEdit={handleStartEditFicha}
            />
          )}
          {activeTab === "propietarios"   && (
            <TabPropietarios 
              propietarios={propietarios} 
              loading={loadingPropietarios} 
              canManagePredios={canManagePredios}
              selectedSchema={selectedSchema}
              onEdit={handleStartEditPropietario}
            />
          )}
          {activeTab === "construcciones" && (
            <TabConstrucciones 
              construcciones={construcciones} 
              loading={loadingConstrucciones} 
              canManagePredios={canManagePredios}
              selectedSchema={selectedSchema}
              onEdit={handleStartEditConstruccion}
            />
          )}
          {activeTab === "calificaciones" && (
            <TabCalificaciones 
              calificaciones={calificaciones} 
              loading={loadingCalificaciones} 
              canManagePredios={canManagePredios}
              selectedSchema={selectedSchema}
              typeOptions={typeOptions}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === "ubicacion"      && (
            <TabUbicacion 
              predio={predio} 
              allPredios={allGeometries.length > 0 ? allGeometries : allPredios}
            />
          )}
        </div>

        {/* Modal footer (Actions) */}
        {(canManagePredios || onClose) && (
          <div style={{
            background: "#f0ece4",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            borderTop: "0.5px solid #e8e4dc",
            flexShrink: 0,
          }}>
            {canManagePredios && (
              <>
                <button
                  onClick={() => {
                    handleDeletePredio(predio.t_id || predio.id, predio);
                  }}
                  style={{
                    background: "#7a1010", color: "#fff", border: "none",
                    borderRadius: 6, padding: "8px 16px", fontSize: 12,
                    fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = 0.9}
                  onMouseOut={e => e.currentTarget.style.opacity = 1}
                >
                  🗑️ Eliminar Predio
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                background: "#fff", color: "#1a1a18", border: "0.5px solid #e8e4dc",
                borderRadius: 6, padding: "8px 16px", fontSize: 12,
                fontWeight: 700, cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseOver={e => e.currentTarget.style.background = "#f0ece4"}
              onMouseOut={e => e.currentTarget.style.background = "#fff"}
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Sub-modal/Overlay para edición de propietario */}
        {editingPropietario && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "#faf7f2",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e8e4dc", paddingBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a18" }}>
                {editingPropietario.isNew ? "➕ Agregar Propietario" : "✏️ Editar Propietario"}
              </h3>
              <button 
                onClick={() => setEditingPropietario(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8a8880", fontSize: 18 }}
              >✕</button>
            </div>
            
            <form onSubmit={handleSavePropietario} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Primer Nombre {!isFormNIT && <span style={{ color: "#7a1010" }}>*</span>}</label>
                  <input 
                    type="text" 
                    value={propForm.primerNombre}
                    onChange={e => setPropForm({ ...propForm, primerNombre: e.target.value })}
                    disabled={isFormNIT}
                    required={!isFormNIT}
                    style={{ width: "100%", padding: "8px 12px", background: isFormNIT ? "#f5f5f5" : "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: isFormNIT ? "#8a8880" : "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Segundo Nombre</label>
                  <input 
                    type="text" 
                    value={propForm.segundoNombre}
                    onChange={e => setPropForm({ ...propForm, segundoNombre: e.target.value })}
                    disabled={isFormNIT}
                    style={{ width: "100%", padding: "8px 12px", background: isFormNIT ? "#f5f5f5" : "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: isFormNIT ? "#8a8880" : "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Primer Apellido {!isFormNIT && <span style={{ color: "#7a1010" }}>*</span>}</label>
                  <input 
                    type="text" 
                    value={propForm.primerApellido}
                    onChange={e => setPropForm({ ...propForm, primerApellido: e.target.value })}
                    disabled={isFormNIT}
                    required={!isFormNIT}
                    style={{ width: "100%", padding: "8px 12px", background: isFormNIT ? "#f5f5f5" : "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: isFormNIT ? "#8a8880" : "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Segundo Apellido</label>
                  <input 
                    type="text" 
                    value={propForm.segundoApellido}
                    onChange={e => setPropForm({ ...propForm, segundoApellido: e.target.value })}
                    disabled={isFormNIT}
                    style={{ width: "100%", padding: "8px 12px", background: isFormNIT ? "#f5f5f5" : "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: isFormNIT ? "#8a8880" : "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Razón Social (Personas Jurídicas) {isFormNIT && <span style={{ color: "#7a1010" }}>*</span>}</label>
                <input 
                  type="text" 
                  value={propForm.razonSocial}
                  onChange={e => setPropForm({ ...propForm, razonSocial: e.target.value })}
                  disabled={!isFormNIT}
                  required={isFormNIT}
                  style={{ width: "100%", padding: "8px 12px", background: !isFormNIT ? "#f5f5f5" : "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: !isFormNIT ? "#8a8880" : "#1a1a18", boxSizing: "border-box" }}
                  placeholder={isFormNIT ? "Ingrese la razón social de la empresa" : "No aplica para personas naturales"}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Documento Identidad</label>
                  <input 
                    type="text" 
                    value={propForm.documento}
                    onChange={e => setPropForm({ ...propForm, documento: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Tipo de Documento</label>
                  <select
                    value={propForm.tipoDocumento}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const docTypeOpt = typeOptions?.documentoTypes?.find(opt => String(opt.t_id) === String(selectedId));
                      const isNIT = docTypeOpt && docTypeOpt.ilicode === 'NIT';
                      setPropForm(prev => ({
                        ...prev,
                        tipoDocumento: selectedId,
                        ...(isNIT ? {
                          primerNombre: "",
                          segundoNombre: "",
                          primerApellido: "",
                          segundoApellido: ""
                        } : {
                          razonSocial: ""
                        })
                      }));
                    }}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.documentoTypes?.map(opt => (
                      <option key={opt.t_id} value={String(opt.t_id)}>
                        {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Tipo de Derecho</label>
                <select
                  value={propForm.tipoDerecho}
                  onChange={e => setPropForm(prev => ({ ...prev, tipoDerecho: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {typeOptions?.derechoTypes?.map(opt => (
                    <option key={opt.t_id} value={String(opt.t_id)}>
                      {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Derecho (%)</label>
                  <input 
                    type="number"
                    step="any"
                    value={propForm.participacion}
                    onChange={e => setPropForm({ ...propForm, participacion: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>No. Escritura / Documento</label>
                  <input 
                    type="text" 
                    value={propForm.escritura}
                    onChange={e => setPropForm({ ...propForm, escritura: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Entidad Emisora</label>
                  <input 
                    type="text" 
                    value={propForm.entidad}
                    onChange={e => setPropForm({ ...propForm, entidad: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Fecha Escritura / Documento</label>
                  <input 
                    type="date" 
                    value={propForm.fechaEscritura}
                    onChange={e => setPropForm({ ...propForm, fechaEscritura: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Tipo de Fuente</label>
                  <select
                    value={propForm.tipoFuente}
                    onChange={e => setPropForm(prev => ({ ...prev, tipoFuente: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.fuenteTypes?.map(opt => (
                      <option key={opt.t_id} value={String(opt.t_id)}>
                        {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Disponibilidad</label>
                  <select
                    value={propForm.disponibilidad}
                    onChange={e => setPropForm(prev => ({ ...prev, disponibilidad: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.disponibilidadTypes?.map(opt => (
                      <option key={opt.t_id} value={String(opt.t_id)}>
                        {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingPropietario(null)}
                  style={{ background: "#fff", color: "#1a1a18", border: "1px solid #e8e4dc", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: "#0a5c3e", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {editingPropietario.isNew ? "Agregar Propietario" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sub-modal/Overlay para edición de construcción */}
        {editingConstruccion && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "#faf7f2",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e8e4dc", paddingBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a18" }}>
                {editingConstruccion.isNew ? "➕ Agregar Unidad de Construcción" : "✏️ Editar Unidad de Construcción"}
              </h3>
              <button 
                onClick={() => setEditingConstruccion(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8a8880", fontSize: 18 }}
              >✕</button>
            </div>
            
            <form onSubmit={handleSaveConstruccion} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Identificador</label>
                  <input 
                    type="text" 
                    value={constForm.identificador}
                    onChange={e => setConstForm({ ...constForm, identificador: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    placeholder="Ej: UC-1"
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Etiqueta</label>
                  <input 
                    type="text" 
                    value={constForm.etiqueta}
                    onChange={e => setConstForm({ ...constForm, etiqueta: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    placeholder="Ej: Unidad 1"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Total Plantas</label>
                  <input 
                    type="number" 
                    value={constForm.totalPlantas}
                    onChange={e => setConstForm({ ...constForm, totalPlantas: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    min="1"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Planta Ubicación</label>
                  <input 
                    type="number" 
                    value={constForm.plantaUbicacion}
                    onChange={e => setConstForm({ ...constForm, plantaUbicacion: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    min="1"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Altura (m)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={constForm.altura}
                    onChange={e => setConstForm({ ...constForm, altura: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    min="0"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Año de Construcción</label>
                  <input 
                    type="number" 
                    value={constForm.anioConstruccion}
                    onChange={e => setConstForm({ ...constForm, anioConstruccion: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    min="1800"
                    max="2100"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Área Construida (m²)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={constForm.areaConstruida}
                    onChange={e => setConstForm({ ...constForm, areaConstruida: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    min="0"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Tipo de Unidad de Construcción</label>
                  <select
                    value={constForm.tipoUnidadConstruccion}
                    onChange={e => setConstForm(prev => ({ ...prev, tipoUnidadConstruccion: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.ucTipos?.map(opt => (
                      <option key={opt.t_id} value={String(opt.t_id)}>
                        {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Uso</label>
                  <select
                    value={constForm.uso}
                    onChange={e => setConstForm(prev => ({ ...prev, uso: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.ucUsos?.map(opt => (
                      <option key={opt.t_id} value={String(opt.t_id)}>
                        {`[${parseInt(opt.t_id, 10) - 200}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Tipo de Planta</label>
                  <select
                    value={constForm.tipoPlanta}
                    onChange={e => setConstForm(prev => ({ ...prev, tipoPlanta: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.ucPlantas?.map(opt => (
                      <option key={opt.t_id} value={String(opt.t_id)}>
                        {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    ))}
                  </select>
                </div>
                {typeOptions?.ucTradicionales && typeOptions.ucTradicionales.length > 0 && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Uso Tradicional / Cultural</label>
                    <select
                      value={constForm.usosTradicionalesCulturales}
                      onChange={e => setConstForm(prev => ({ ...prev, usosTradicionalesCulturales: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    >
                      <option value="">Seleccionar...</option>
                      {typeOptions?.ucTradicionales?.map(opt => (
                        <option key={opt.t_id} value={String(opt.t_id)}>
                          {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingConstruccion(null)}
                  style={{ background: "#fff", color: "#1a1a18", border: "1px solid #e8e4dc", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: "#0a5c3e", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {editingConstruccion.isNew ? "Agregar Construcción" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sub-modal/Overlay para edición de Ficha */}
        {editingFicha && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "#faf7f2",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e8e4dc", paddingBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a18" }}>
                ✏️ Editar Ficha Catastral
              </h3>
              <button 
                onClick={() => setEditingFicha(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8a8880", fontSize: 18 }}
              >✕</button>
            </div>
            
            <form onSubmit={handleSaveFicha} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>NPN (Número Predial Nacional)</label>
                  <input 
                    type="text" 
                    value={fichaForm.numero_predial_nacional}
                    onChange={e => setFichaForm({ ...fichaForm, numero_predial_nacional: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Matrícula Inmobiliaria</label>
                  <input 
                    type="number" 
                    value={fichaForm.matricula_inmobiliaria}
                    onChange={e => setFichaForm({ ...fichaForm, matricula_inmobiliaria: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    min="0"
                    max="2147483647"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Número de Ficha</label>
                  <input 
                    type="text" 
                    value={fichaForm.espacio_de_nombres}
                    onChange={e => setFichaForm({ ...fichaForm, espacio_de_nombres: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Nombre / Descripción</label>
                  <input 
                    type="text" 
                    value={fichaForm.nombre}
                    onChange={e => setFichaForm({ ...fichaForm, nombre: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                    placeholder="Ej: LOTE LA ESMERALDA"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Departamento</label>
                  <input 
                    type="text" 
                    value={fichaForm.departamento}
                    onChange={e => setFichaForm({ ...fichaForm, departamento: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Municipio</label>
                  <input 
                    type="text" 
                    value={fichaForm.municipio}
                    onChange={e => setFichaForm({ ...fichaForm, municipio: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Círculo ORIP</label>
                  <input 
                    type="text" 
                    value={fichaForm.codigo_orip}
                    onChange={e => setFichaForm({ ...fichaForm, codigo_orip: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Condición Predio</label>
                  <select
                    value={fichaForm.condicion_predio}
                    onChange={e => setFichaForm(prev => ({ ...prev, condicion_predio: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.condiciones?.map(opt => (
                      <option key={opt.t_id} value={String(opt.t_id)}>
                        {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Tipo Predio</label>
                  <select
                    value={fichaForm.tipo_predio}
                    onChange={e => setFichaForm(prev => ({ ...prev, tipo_predio: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.tipos?.map(opt => (
                      <option key={opt.t_id} value={String(opt.t_id)}>
                        {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#6a6860", marginBottom: 6 }}>Destino Económico</label>
                  <select
                    value={fichaForm.uso_predio}
                    onChange={e => setFichaForm(prev => ({ ...prev, uso_predio: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", background: "#fff", border: "1px solid #e8e4dc", borderRadius: 6, fontSize: 13, color: "#1a1a18", boxSizing: "border-box" }}
                  >
                    <option value="">Seleccionar...</option>
                    {typeOptions?.destinaciones?.map(opt => (
                      <option key={opt.t_id} value={String(opt.t_id)}>
                        {`[${opt.t_id}] ${opt.ilicode ? `[${opt.ilicode}] ` : ''}${opt.dispname || opt.ilicode || opt.t_id}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingFicha(false)}
                  style={{ background: "#fff", color: "#1a1a18", border: "1px solid #e8e4dc", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: "#0a5c3e", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
