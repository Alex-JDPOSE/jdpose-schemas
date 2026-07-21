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
  const containerRef = useRef(null);
  const bgImageRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const [textItems, setTextItems] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [pageNum, setPageNum] = useState(1);

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

  const clearCanvasOnly = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    bgImageRef.current = null;
    setTextItems([]);
    historyRef.current = [];
    redoRef.current = [];
    pushHistory();
  };

  const clearAll = () => {
    clearCanvasOnly();
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

  const getPercentPos = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      xPct: ((clientX - rect.left) / rect.width) * 100,
      yPct: ((clientY - rect.top) / rect.height) * 100,
    };
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
    if (tool === "text") {
      const label = window.prompt("Texte à insérer :", "");
      if (label) {
        const { xPct, yPct } = getPercentPos(e);
        setTextItems((prev) => [
          ...prev,
          { id: Date.now() + Math.random(), text: label, color, xPct, yPct },
        ]);
      }
      return;
    }

    e.preventDefault();
    const ctx = ctxRef.current;
    const pos = getPos(e);
    setStartPos(pos);
    setIsDrawing(true);

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

  const handleTextPointerDown = (e, id) => {
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleContainerPointerMove = (e) => {
    if (draggingId == null) return;
    const { xPct, yPct } = getPercentPos(e);
    setTextItems((prev) =>
      prev.map((t) => (t.id === draggingId ? { ...t, xPct, yPct } : t))
    );
  };

  const handleContainerPointerUp = () => {
    setDraggingId(null);
  };

  const removeTextItem = (id) => {
    setTextItems((prev) => prev.filter((t) => t.id !== id));
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

  const buildFinalBlob = (callback) => {
    const canvas = canvasRef.current;
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const fctx = finalCanvas.getContext("2d");

    fctx.drawImage(canvas, 0, 0);

    textItems.forEach((t) => {
      const x = (t.xPct / 100) * canvas.width;
      const y = (t.yPct / 100) * canvas.height;
      fctx.fillStyle = t.color;
      fctx.font = "20px sans-serif";
      fctx.fillText(t.text, x, y);
    });

    finalCanvas.toBlob(callback, "image/png");
  };

  // Enregistre la feuille actuelle, sans rien changer d'autre
  const handleExport = () => {
    buildFinalBlob((blob) => {
      if (blob && onSave) onSave(blob);
    });
  };

  // Enregistre la feuille actuelle PUIS repart sur une feuille vierge
  const handleExportAndNewSheet = () => {
    buildFinalBlob((blob) => {
      if (blob && onSave) onSave(blob);
      clearCanvasOnly();
      setPageNum((p) => p + 1);
    });
  };

  return (
    <div style={styles.wrapper}>
      <div
