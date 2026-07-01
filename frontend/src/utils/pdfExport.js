import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { formatBirthDate, calculateAge } from './formatters';

/**
 * Genera y descarga un reporte PDF con la lista de habitantes.
 *
 * @param {Array<object>} habitantes - Habitantes filtrados a exportar
 * @param {object} options
 * @param {object} options.comunidadInfo - Información completa de la comunidad
 * @param {object} options.currentUser - Usuario logueado actual
 * @param {string} options.selectedCalle - Calle filtrada (si existe)
 */
export const exportHabitantesToPDF = (habitantes, { comunidadInfo, currentUser, selectedCalle }) => {
  // Inicializar documento en orientación horizontal (landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const marginX = 14;
  const pageWidth = doc.internal.pageSize.width; // A4 horizontal: 297mm
  const pageHeight = doc.internal.pageSize.height; // A4 horizontal: 210mm

  // 1. Encabezado de la República e Institución
  doc.setTextColor(33, 33, 33);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA', marginX, 12);

  // Obtener datos geográficos de la comunidad (desde options o desde el primer habitante si está poblado)
  const firstHab = habitantes[0]?.comunidad;
  const estado = (comunidadInfo?.estado || firstHab?.estado || '—');
  const municipio = (comunidadInfo?.municipio || firstHab?.municipio || '—');
  const parroquia = (comunidadInfo?.parroquia || firstHab?.parroquia || '—');
  const comunidadNombre = (comunidadInfo?.nombre || firstHab?.nombre || currentUser?.comunidad?.nombre || 'Todas las Comunidades');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Estado: ${estado.toUpperCase()}   |   Municipio: ${municipio.toUpperCase()}   |   Parroquia: ${parroquia.toUpperCase()}`,
    marginX,
    17
  );
  doc.text(`Comunidad: ${comunidadNombre.toUpperCase()}`, marginX, 22);

  // Metadatos de fecha y filtro de calle a la derecha
  const dateStr = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'bold');
  doc.text(`Fecha: ${dateStr}`, pageWidth - marginX - 50, 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Calle: ${selectedCalle ? selectedCalle.toUpperCase() : 'TODAS LAS CALLES'}`, pageWidth - marginX - 50, 17);

  // Título del Reporte
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(51, 51, 102); // Tono morado
  doc.text('REPORTE GENERAL DE HABITANTES', pageWidth / 2, 30, { align: 'center' });

  // Restaurar color a negro para el resto del documento
  doc.setTextColor(0, 0, 0);

  // Definición de columnas de la tabla
  const tableColumn = [
    'N.º',
    'Nombre Completo',
    'Cédula',
    'Teléfono',
    'F. Nacimiento',
    'Edad',
    'Jefe Fam.',
    'Calle',
    'N.º Casa',
    'Discapacidad',
  ];

  // Mapear habitantes a filas de la tabla
  const tableRows = habitantes.map((h, index) => {
    // Formatear nombres capitalizados
    const nombresStr = `${h.nombres} ${h.apellidos}`
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    return [
      index + 1,
      nombresStr,
      h.cedula || 'No posee',
      h.telefono || '—',
      h.fechaNacimiento ? formatBirthDate(h.fechaNacimiento) : '—',
      h.fechaNacimiento ? `${calculateAge(h.fechaNacimiento)} años` : '—',
      h.jefeFamilia ? 'X' : '',
      h.calle || '—',
      h.numeroCasa || '—',
      h.discapacitado || '—',
    ];
  });

  // Generar tabla usando jspdf-autotable
  doc.autoTable({
    startY: 36,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [51, 51, 102],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // N.º
      1: { cellWidth: 50 }, // Nombre
      2: { cellWidth: 22, halign: 'center' }, // Cédula
      3: { cellWidth: 26, halign: 'center' }, // Teléfono
      4: { cellWidth: 25, halign: 'center' }, // F. Nacimiento
      5: { cellWidth: 15, halign: 'center' }, // Edad
      6: { cellWidth: 18, halign: 'center' }, // Jefe Familia (X)
      7: { cellWidth: 32 }, // Calle
      8: { cellWidth: 16, halign: 'center' }, // N.º Casa
      9: { cellWidth: 40 }, // Discapacidad
    },
    margin: { left: marginX, right: marginX },
    styles: {
      overflow: 'linebreak',
    },
  });

  // Determinar la coordenada Y final de la tabla
  const finalY = doc.lastAutoTable.finalY || 100;
  let signatureY = finalY + 22;

  // Evitar saltos de página huérfanos para el bloque de firma
  if (signatureY + 38 > pageHeight) {
    doc.addPage();
    signatureY = 30;
  }

  // Dibujar línea de firma centrada
  const signatureWidth = 70;
  const lineX1 = (pageWidth - signatureWidth) / 2;
  const lineX2 = lineX1 + signatureWidth;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(lineX1, signatureY, lineX2, signatureY);

  // Escribir metadatos y etiquetas bajo la firma
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('DOCUMENTO EMITIDO POR:', pageWidth / 2, signatureY + 5, { align: 'center' });

  const currentUserName = `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim();
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(9);
  doc.text(currentUserName.toUpperCase(), pageWidth / 2, signatureY + 10, { align: 'center' });

  // Rol descriptivo
  let roleLabel = 'Usuario Registrado';
  if (currentUser?.role === 'LIDER_CALLE') {
    roleLabel = `Líder de Calle (Calle: ${currentUser?.calle || 'Sin Asignar'})`;
  } else if (currentUser?.role === 'JEFE_COMUNIDAD') {
    roleLabel = 'Jefe de Comunidad';
  } else if (currentUser?.role === 'admin') {
    roleLabel = 'Administrador del Sistema';
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(roleLabel, pageWidth / 2, signatureY + 14, { align: 'center' });

  // Descargar archivo PDF
  const safeComunidadName = comunidadNombre.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const filename = `habitantes_${safeComunidadName}_${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
};
