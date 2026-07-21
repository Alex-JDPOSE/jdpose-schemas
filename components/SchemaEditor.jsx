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
      setSnapshot(canvasRef.current.toDa
