"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  signerName: string;
  signerDocument: string | null;
}

function configureContext(context: CanvasRenderingContext2D, ratio: number) {
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 2.2;
  context.strokeStyle = "#2f211d";
}

export function SignaturePad({ onChange, signerName, signerDocument }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inked = useRef(false);
  const ratioRef = useRef(1);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      ratioRef.current = ratio;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (context) configureContext(context, ratio);
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
    if (canvas && context) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      configureContext(context, ratioRef.current);
    }
    drawing.current = false;
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
        <span>Realiza una firma legible dentro del recuadro usando el mouse o el dedo.</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear}>Limpiar</Button>
      </div>
      <div className="grid gap-2 rounded-lg border bg-stone-50 px-4 py-3 text-sm sm:grid-cols-2">
        <div><span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Nombre del firmante</span><strong>{signerName}</strong></div>
        <div><span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Cédula</span><strong>{signerDocument || "No registrada"}</strong></div>
      </div>
    </div>
  );
}
