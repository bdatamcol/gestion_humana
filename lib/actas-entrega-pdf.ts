import { jsPDF } from "jspdf";

const COLORS = {
  ink: [31, 41, 55] as const,
  muted: [100, 116, 139] as const,
  line: [218, 224, 230] as const,
  paper: [248, 250, 252] as const,
  accent: [14, 116, 144] as const,
  accentSoft: [236, 254, 255] as const,
  warningSoft: [255, 251, 235] as const,
  warning: [146, 64, 14] as const,
};

async function imageToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No fue posible cargar una imagen del acta");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function readableState(value: string | null | undefined) {
  const labels: Record<string, string> = {
    bueno: "Bueno",
    regular: "Regular",
    malo: "Malo",
    no_recibido: "No recibido",
    completada: "Completada",
    aceptada_con_novedades: "Aceptada con novedades",
  };
  return labels[value || ""] || value || "Sin registrar";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin registrar";
  return new Date(value).toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function downloadActaPdf(acta: any) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 17;
  let y = 0;

  const setTextColor = (color: readonly [number, number, number]) => pdf.setTextColor(color[0], color[1], color[2]);
  const setFillColor = (color: readonly [number, number, number]) => pdf.setFillColor(color[0], color[1], color[2]);
  const setDrawColor = (color: readonly [number, number, number]) => pdf.setDrawColor(color[0], color[1], color[2]);

  const addImageContained = (dataUrl: string, x: number, imageY: number, maxWidth: number, maxHeight: number) => {
    const properties = pdf.getImageProperties(dataUrl);
    const ratio = Math.min(maxWidth / properties.width, maxHeight / properties.height);
    const width = properties.width * ratio;
    const height = properties.height * ratio;
    const format = dataUrl.startsWith("data:image/png") ? "PNG" : dataUrl.startsWith("data:image/webp") ? "WEBP" : "JPEG";
    pdf.addImage(dataUrl, format, x + (maxWidth - width) / 2, imageY + (maxHeight - height) / 2, width, height, undefined, "FAST");
  };

  const addPageHeader = (firstPage = false) => {
    setFillColor(COLORS.accent);
    pdf.rect(0, 0, pageWidth, 3, "F");
    setFillColor(COLORS.paper);
    pdf.rect(0, 3, pageWidth, firstPage ? 34 : 25, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    setTextColor(COLORS.accent);
    pdf.text("GESTIÓN HUMANA 360", margin, 11);
    pdf.setFontSize(firstPage ? 18 : 12);
    setTextColor(COLORS.ink);
    pdf.text(firstPage ? "Acta de entrega" : "Acta de entrega · Continuación", margin, firstPage ? 21 : 18);

    if (firstPage) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      setTextColor(COLORS.muted);
      pdf.text("Entrega y recepción de elementos del puesto de trabajo", margin, 28);
    }

    const chipWidth = 47;
    setFillColor(COLORS.accentSoft);
    pdf.roundedRect(pageWidth - margin - chipWidth, firstPage ? 10 : 8, chipWidth, 12, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    setTextColor(COLORS.accent);
    pdf.text(acta.numero_acta, pageWidth - margin - chipWidth / 2, firstPage ? 17.5 : 15.5, { align: "center" });
    y = firstPage ? 44 : 35;
  };

  const newPage = () => {
    pdf.addPage();
    addPageHeader(false);
  };

  const ensureSpace = (height: number) => {
    if (y + height > bottomLimit) newPage();
  };

  const sectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 15 : 10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    setTextColor(COLORS.ink);
    pdf.text(title, margin, y);
    setFillColor(COLORS.accent);
    pdf.roundedRect(margin, y + 3, 9, 1.2, 0.6, 0.6, "F");
    if (subtitle) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      setTextColor(COLORS.muted);
      pdf.text(subtitle, margin, y + 8);
      y += 14;
    } else {
      y += 9;
    }
  };

  const smallLabel = (text: string, x: number, textY: number) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.7);
    setTextColor(COLORS.muted);
    pdf.text(text.toUpperCase(), x, textY);
  };

  addPageHeader(true);

  // Compact document summary.
  const summaryHeight = 22;
  setDrawColor(COLORS.line);
  pdf.roundedRect(margin, y, contentWidth, summaryHeight, 2.5, 2.5, "S");
  const summaryColumns = [
    { label: "Empresa", value: acta.empresa_nombre },
    { label: "Estado", value: readableState(acta.estado) },
    { label: "Fecha de envío", value: formatDate(acta.fecha_envio) },
    { label: "Fecha de recibido", value: formatDate(acta.fecha_respuesta) },
  ];
  const summaryColumnWidth = contentWidth / summaryColumns.length;
  summaryColumns.forEach((column, index) => {
    const x = margin + index * summaryColumnWidth;
    if (index > 0) {
      setDrawColor(COLORS.line);
      pdf.line(x, y + 4, x, y + summaryHeight - 4);
    }
    smallLabel(column.label, x + 4, y + 7);
    pdf.setFont("helvetica", index === 1 ? "bold" : "normal");
    pdf.setFontSize(8.3);
    setTextColor(index === 1 ? COLORS.accent : COLORS.ink);
    const lines = pdf.splitTextToSize(column.value || "Sin registrar", summaryColumnWidth - 8);
    pdf.text(lines.slice(0, 2), x + 4, y + 13);
  });
  y += summaryHeight + 11;

  // Participants use the same baseline and visual weight.
  sectionTitle("Participantes", "Datos registrados al momento de crear el acta");
  const participantGap = 6;
  const participantWidth = (contentWidth - participantGap) / 2;
  const participantHeight = 34;
  const participantY = y;
  const participants = [
    {
      role: "ENTREGA",
      name: acta.entregante_nombre,
      cargo: acta.entregante_cargo,
      document: acta.entregante_documento,
    },
    {
      role: "RECIBE",
      name: acta.receptor_nombre,
      cargo: acta.receptor_cargo,
      document: acta.receptor_documento,
    },
  ];
  participants.forEach((participant, index) => {
    const x = margin + index * (participantWidth + participantGap);
    setFillColor(COLORS.paper);
    pdf.roundedRect(x, participantY, participantWidth, participantHeight, 2.5, 2.5, "F");
    setFillColor(COLORS.accent);
    pdf.roundedRect(x, participantY, 2.2, participantHeight, 1, 1, "F");
    smallLabel(participant.role, x + 7, participantY + 8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.2);
    setTextColor(COLORS.ink);
    pdf.text(pdf.splitTextToSize(participant.name || "Sin registrar", participantWidth - 13).slice(0, 2), x + 7, participantY + 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.7);
    setTextColor(COLORS.muted);
    pdf.text(participant.cargo || "Cargo no registrado", x + 7, participantY + 24);
    pdf.text(`Documento: ${participant.document || "No registrado"}`, x + 7, participantY + 29);
  });
  y += participantHeight + 12;

  sectionTitle("Elementos entregados", `${acta.actas_entrega_items.length} elemento${acta.actas_entrega_items.length === 1 ? "" : "s"} registrado${acta.actas_entrega_items.length === 1 ? "" : "s"}`);

  for (let index = 0; index < acta.actas_entrega_items.length; index += 1) {
    const item = acta.actas_entrega_items[index];
    const evidence = acta.actas_entrega_evidencias.filter((file: any) => file.item_id === item.id && file.url);
    const deliveryNotes = item.observaciones_entrega
      ? pdf.splitTextToSize(item.observaciones_entrega, contentWidth - 18)
      : [];
    const receptionNotes = item.notas_recepcion
      ? pdf.splitTextToSize(item.notas_recepcion, contentWidth - 18)
      : [];
    const notesHeight = (deliveryNotes.length ? deliveryNotes.length * 3.7 + 8 : 0)
      + (receptionNotes.length ? receptionNotes.length * 3.7 + 8 : 0);
    const evidenceRows = Math.ceil(evidence.length / 2);
    const evidenceHeight = evidence.length ? 9 + evidenceRows * 51 : 0;
    const cardHeight = 36 + notesHeight + evidenceHeight;

    // Keep ordinary items and their evidence together. Very large evidence sets continue naturally.
    if (cardHeight <= bottomLimit - 35) ensureSpace(cardHeight + 7);
    else ensureSpace(42 + notesHeight);

    const cardY = y;
    const summaryCardHeight = 36 + notesHeight;
    setDrawColor(COLORS.line);
    pdf.roundedRect(margin, cardY, contentWidth, summaryCardHeight, 2.5, 2.5, "S");
    setFillColor(COLORS.accent);
    pdf.roundedRect(margin, cardY, 13, 13, 2.5, 2.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(index + 1).padStart(2, "0"), margin + 6.5, cardY + 8.5, { align: "center" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    setTextColor(COLORS.ink);
    pdf.text(pdf.splitTextToSize(item.descripcion, contentWidth - 22).slice(0, 2), margin + 18, cardY + 7.5);

    const factsY = cardY + 19;
    const factWidth = (contentWidth - 18) / 4;
    const facts = [
      ["Cantidad", String(item.cantidad)],
      ["Identificador", item.serial_identificador || "No registrado"],
      ["Recepción", item.recibido ? "Recibido" : "No recibido"],
      ["Estado", readableState(item.estado_recepcion)],
    ];
    facts.forEach(([label, value], factIndex) => {
      const x = margin + 9 + factIndex * factWidth;
      smallLabel(label, x, factsY);
      pdf.setFont("helvetica", factIndex >= 2 ? "bold" : "normal");
      pdf.setFontSize(8.1);
      setTextColor(factIndex === 3 ? COLORS.accent : COLORS.ink);
      pdf.text(pdf.splitTextToSize(value, factWidth - 3).slice(0, 2), x, factsY + 5);
    });

    let notesY = cardY + 34;
    if (deliveryNotes.length) {
      smallLabel("Observaciones de entrega", margin + 9, notesY);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.8);
      setTextColor(COLORS.ink);
      pdf.text(deliveryNotes, margin + 9, notesY + 4.5);
      notesY += deliveryNotes.length * 3.7 + 8;
    }
    if (receptionNotes.length) {
      setFillColor(COLORS.warningSoft);
      pdf.roundedRect(margin + 6, notesY - 3.5, contentWidth - 12, receptionNotes.length * 3.7 + 8, 1.5, 1.5, "F");
      smallLabel("Novedad de recepción", margin + 9, notesY + 0.5);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.8);
      setTextColor(COLORS.warning);
      pdf.text(receptionNotes, margin + 9, notesY + 5);
    }
    y += summaryCardHeight;

    if (evidence.length) {
      if (cardHeight > bottomLimit - 35 && y + 60 > bottomLimit) {
        newPage();
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        setTextColor(COLORS.ink);
        pdf.text(`${String(index + 1).padStart(2, "0")} · ${item.descripcion}`, margin, y);
        y += 6;
      }
      setFillColor(COLORS.paper);
      pdf.rect(margin, y, contentWidth, 8, "F");
      smallLabel(`Evidencias fotográficas · ${evidence.length}`, margin + 5, y + 5.2);
      y += 10;

      for (let photoIndex = 0; photoIndex < evidence.length; photoIndex += 1) {
        if (photoIndex % 2 === 0) ensureSpace(49);
        const imageGap = 5;
        const imageWidth = (contentWidth - imageGap) / 2;
        const x = margin + (photoIndex % 2) * (imageWidth + imageGap);
        setFillColor(COLORS.paper);
        setDrawColor(COLORS.line);
        pdf.roundedRect(x, y, imageWidth, 45, 2, 2, "FD");
        try {
          const dataUrl = await imageToDataUrl(evidence[photoIndex].url);
          addImageContained(dataUrl, x + 2, y + 2, imageWidth - 4, 41);
        } catch {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          setTextColor(COLORS.muted);
          pdf.text("Imagen no disponible", x + imageWidth / 2, y + 23, { align: "center" });
        }
        if (photoIndex % 2 === 1 || photoIndex === evidence.length - 1) y += 49;
      }
    }
    y += 8;
  }

  // Signatures close the document and never appear as orphaned fragments.
  ensureSpace(71);
  sectionTitle("Constancia y firmas", "Las firmas corresponden a la versión final de esta acta");
  const signatureGap = 6;
  const signatureWidth = (contentWidth - signatureGap) / 2;
  const signatureHeight = 49;
  const signatureY = y;
  const signatures = ["entregante", "receptor"].map((role) =>
    acta.actas_entrega_firmas.find((signature: any) => signature.rol_firmante === role),
  );
  for (let index = 0; index < signatures.length; index += 1) {
    const signature = signatures[index];
    const x = margin + index * (signatureWidth + signatureGap);
    setDrawColor(COLORS.line);
    pdf.roundedRect(x, signatureY, signatureWidth, signatureHeight, 2.5, 2.5, "S");
    setFillColor(COLORS.paper);
    pdf.roundedRect(x + 4, signatureY + 4, signatureWidth - 8, 25, 1.5, 1.5, "F");
    if (signature?.url) {
      try {
        const dataUrl = await imageToDataUrl(signature.url);
        addImageContained(dataUrl, x + 8, signatureY + 6, signatureWidth - 16, 21);
      } catch {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        setTextColor(COLORS.muted);
        pdf.text("Firma no disponible", x + signatureWidth / 2, signatureY + 17, { align: "center" });
      }
    }
    const personName = index === 0 ? acta.entregante_nombre : acta.receptor_nombre;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.2);
    setTextColor(COLORS.ink);
    pdf.text(pdf.splitTextToSize(personName, signatureWidth - 10).slice(0, 1), x + 5, signatureY + 36);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    setTextColor(COLORS.muted);
    pdf.text(index === 0 ? "Entregante" : "Receptor", x + 5, signatureY + 41);
    pdf.text(signature?.firmada_at ? formatDate(signature.firmada_at) : "Fecha no registrada", x + 5, signatureY + 45.5);
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    setDrawColor(COLORS.line);
    pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.8);
    setTextColor(COLORS.muted);
    pdf.text(`Documento generado por Gestión Humana 360 · ${acta.numero_acta}`, margin, pageHeight - 8);
    pdf.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  const safeName = String(acta.numero_acta).replace(/[^a-zA-Z0-9-_]/g, "-");
  pdf.save(`${safeName}.pdf`);
}
