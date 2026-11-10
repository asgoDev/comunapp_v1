const API_FIELD_MAP = {
  calle: 'calle',
  numeroCasa: 'numeroCasa',
  propietario: 'propietario',
  referencia: 'referencia',
  comprobante: 'comprobante',
  bombonasGrande: 'bombonas.grande',
  bombonasMediana: 'bombonas.mediana',
  bombonasPequena: 'bombonas.pequena',
};

const API_MESSAGES = {
  JORNADA_NO_ACTIVA: 'La jornada ya no está activa. Vuelva a consultar la comunidad.',
  REFERENCIA_DUPLICADA: 'Esta referencia ya fue registrada para la jornada.',
  CASA_NO_ENCONTRADA: 'La combinación de calle y casa ya no está disponible. Vuelva a seleccionarla.',
  PAGO_IDEMPOTENCIA_CONFLICTO: 'Este intento ya se procesó con otros datos. Revise la información antes de continuar.',
  RATE_LIMITED: 'Se alcanzó el límite de solicitudes. Espere un momento antes de reintentar.',
  CLOUDINARY_NOT_CONFIGURED: 'El servicio de comprobantes no está disponible temporalmente.',
  CLOUDINARY_UPLOAD_FAILED: 'No se pudo almacenar el comprobante. Sus datos se conservan para reintentar.',
  PAYMENT_COMMIT_UNCONFIRMED: 'No se pudo confirmar el resultado. Reintente sin cambiar los datos.',
  FILE_TOO_LARGE: 'El comprobante supera el máximo de 5 MB.',
  FILE_REQUIRED: 'Seleccione el comprobante de pago.',
  INVALID_FILE_TYPE: 'El comprobante debe ser JPG o PNG.',
  INVALID_FILE_SIGNATURE: 'El contenido no coincide con una imagen JPG o PNG válida.',
};

export function mapBombonaApiErrors(errors, setError) {
  if (!Array.isArray(errors)) return;
  for (const apiError of errors) {
    const field = API_FIELD_MAP[apiError.campo];
    if (field && apiError.mensaje) {
      setError(field, { type: 'server', message: apiError.mensaje });
    }
  }
}

export function getBombonaErrorMessage(error) {
  const code = error.response?.data?.code;
  if (code && API_MESSAGES[code]) return API_MESSAGES[code];
  if (error.response?.status >= 500) {
    return 'No fue posible completar la solicitud por un problema temporal. Intente nuevamente.';
  }
  return error.response?.data?.message || 'No se pudo registrar la solicitud. Revise los datos e intente nuevamente.';
}

export function getBombonaErrorCode(error) {
  return error.response?.data?.code;
}
