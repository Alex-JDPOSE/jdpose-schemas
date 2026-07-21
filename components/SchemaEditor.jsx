import React, { useRef, useState, useEffect, useCallback } from "react";

const TOOLS = [
  { id: "pen", label: "Stylo" },
  { id: "line", label: "Ligne" },
  { id: "rect", label: "Rectangle" },
  { id: "circle", label: "Cercle" },
  { id: "arrow", label: "Flèche" },
  { id: "text", label: "Texte" },
  { id: "eraser", label: "Gomme" },
];

const COLORS = ["#1a1a1a", "#d64545", "#2f6fed", "#2f9e44", "#f08c00"];

export default function SchemaEditor({ onSave, width = 900, height = 600 }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const bgImageRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const historyRef = useRef([]);
  const redoRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    pushHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    historyRef.current.push(canvas.toDataURL());
    if (historyRef.current.length > 30) historyRef.current.shift();
    redoRef.current = [];
  }, []);

  const restoreFromDataUrl = (dataUrl) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  };

  const undo = () => {
    if (historyRef.current.length <= 1) return;
    const current = historyRef.current.pop();
    redoRef.current.push(current);
    restoreFromDataUrl(historyRef.current[historyRef.current.length - 1]);
  };

  const redo = () => {
    if (redoRef.current.length === 0) return;
    const next = redoRef.current.pop();
    historyRef.current.push(next);
    restoreFromDataUrl(next);
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    bgImageRef.current = null;
    pushHistory();
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const drawArrowHead = (ctx, from, to) => {
    const headLength = 14;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle - Math.PI / 6),
      to.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLength * Math.cos(angle + Math.PI / 6),
      to.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const handleStart = (e) => {
    e.preventDefault();
    const ctx = ctxRef.current;
    const pos = getPos(e);
    setStartPos(pos);
    setIsDrawing(true);

    if (tool === "text") {
      const label = window.prompt("Texte à insérer :", "");
      if (label) {
        ctx.fillStyle = color;
        ctx.font = "20px sans-serif";
        ctx.fillText(label, pos.x, pos.y);
        pushHistory();
      }
      setIsDrawing(false);
      return;
    }

    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else {
      setSnapshot(canvasRef.current.toDataURL());
    }
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    const pos = getPos(e);

    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 4 : lineWidth;

    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      return;
    }

    if (snapshot) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        drawShapePreview(ctx, startPos, pos);
      };
      img.src = snapshot;
    }
  };

  const drawShapePreview = (ctx, from, to) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (tool === "line" || tool === "arrow") {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      if (tool === "arrow") drawArrowHead(ctx, from, to);
    } else if (tool === "rect") {
      ctx.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
    } else if (tool === "circle") {
      const r = Math.hypot(to.x - from.x, to.y - from.y);
      ctx.beginPath();
      ctx.arc(from.x, from.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    pushHistory();
    setSnapshot(null);
  };

  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, w, h);
        bgImageRef.current = ev.target.result;
        pushHistory();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (blob && onSave) onSave(blob);
    }, "image/png");
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              style={{
                ...styles.toolBtn,
                ...(tool === t.id ? styles.toolBtnActive : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={styles.toolGroup}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              style={{
                ...styles.colorSwatch,
                background: c,
                outline: color === c ? "2px solid #1a1a1a" : "1px solid #ccc",
              }}
            />
          ))}
          <input
            type="range"
            min="1"
            max="12"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </div>

        <div style={styles.toolGroup}>
          <label style={styles.fileBtn}>
            Photo de fond
            <input type="file" accept="image/*" onChange={handleBgUpload} hidden />
          </label>
          <button onClick={undo} style={styles.actionBtn}>↩ Annuler</button>
          <button onClick={redo} style={styles.actionBtn}>↪ Rétablir</button>
          <button onClick={clearAll} style={styles.actionBtnDanger}>Effacer tout</button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      <div style={styles.footer}>
        <button onClick={handleExport} style={styles.saveBtn}>
          Enregistrer le schéma
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    fontFamily: "system-ui, sans-serif",
    maxWidth: 940,
    margin: "0 auto",
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    padding: "8px 4px",
  },
  toolGroup: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  toolBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d0d0d0",
    background: "#f5f5f5",
    cursor: "pointer",
    fontSize: 14,
  },
  toolBtnActive: {
    background: "#1a1a1a",
    color: "#fff",
    borderColor: "#1a1a1a",
  },
  colorSwatch: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    cursor: "pointer",
  },
  fileBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d0d0d0",
    background: "#f5f5f5",
    cursor: "pointer",
    fontSize: 14,
  },
  actionBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d0d0d0",
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  actionBtnDanger: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e0a0a0",
    background: "#fff5f5",
    color: "#a12626",
    cursor: "pointer",
    fontSize: 14,
  },
  canvas: {
    width: "100%",
    touchAction: "none",
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
    cursor: "crosshair",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
  },
  saveBtn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: "#2f6fed",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
};
