const buildKeywordConditions = (keyword) => {
  const tokens = String(keyword || "")
    .trim()
    .slice(0, 100)
    .split(/\s+/)
    .filter(Boolean);
  const fields = [
    "p.title",
    "p.description",
    "p.address_detail",
    "u.full_name",
    "l.name",
  ];
  const values = [];
  const conditions = tokens.map((token) => {
    const escaped = token.replace(/[\\%_]/g, "\\$&");
    values.push(...fields.map(() => `%${escaped}%`));
    return `(${fields.map((field) => `${field} LIKE ?`).join(" OR ")})`;
  });
  return { conditions, values };
};

module.exports = { buildKeywordConditions };
