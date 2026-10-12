const MAX_SELECTABLE_NOTIFICATIONS = 50;

const normalizeNotificationIds = (values) => {
  if (
    !Array.isArray(values) ||
    values.length < 1 ||
    values.length > MAX_SELECTABLE_NOTIFICATIONS
  ) {
    return null;
  }

  const ids = values.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) return null;

  return [...new Set(ids)];
};

module.exports = { normalizeNotificationIds };
