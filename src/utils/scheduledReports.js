const SCHEDULE_KEY_PREFIX = 'construleads-scheduled-report';

function getScheduleKey(user = {}) {
  return `${SCHEDULE_KEY_PREFIX}-${user.idUsuario || user.correo || user.email || 'guest'}`;
}

export function getScheduledReport(user = {}) {
  try {
    const stored = JSON.parse(localStorage.getItem(getScheduleKey(user)) || 'null');
    return stored && typeof stored === 'object' ? stored : null;
  } catch {
    return null;
  }
}

export function saveScheduledReport(user = {}, report = {}) {
  const nextReport = {
    ...report,
    id: report.id || `schedule-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(getScheduleKey(user), JSON.stringify(nextReport));
    window.dispatchEvent(new Event('construleads-scheduled-report-updated'));
  } catch {
    // La programación es opcional; si el almacenamiento no está disponible,
    // la descarga normal sigue funcionando sin interrupciones.
  }

  return nextReport;
}

export function clearScheduledReport(user = {}) {
  try {
    localStorage.removeItem(getScheduleKey(user));
    window.dispatchEvent(new Event('construleads-scheduled-report-updated'));
  } catch {
    // La acción no debe afectar el resto de la sesión.
  }
}
