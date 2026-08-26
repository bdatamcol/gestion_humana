"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
}

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inked = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (context) {
        context.scale(ratio, ratio);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 2.2;
        context.strokeStyle = "#2f211d";
      }
    };
    resize();
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    context?.beginPath();
    context?.moveTo(current.x, current.y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    context?.lineTo(current.x, current.y);
    context?.stroke();
    inked.current = true;
    if (!hasSignature) setHasSignature(true);
  };

  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && inked.current) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    inked.current = false;
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border-2 border-dashed border-stone-300 bg-white">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
          aria-label="Área para dibujar la firma"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Firma dentro del recuadro usando el mouse o el dedo.</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>Limpiar</Button>
      </div>
    </div>
  );
}
