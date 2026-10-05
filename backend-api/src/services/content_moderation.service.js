const defaultBlockedWords = [
  "fuck",
  "shit",
  "bitch",
  "địt",
  "đụ",
  "đéo",
  "lồn",
  "cặc",
  "đĩ",
];

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLocaleLowerCase("vi")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getBlockedWords = () => {
  const configured = process.env.POST_BLOCKED_WORDS;
  return (configured ? configured.split(",") : defaultBlockedWords)
    .map(normalize)
    .filter(Boolean);
};

const findBlockedWord = (value) => {
  const content = ` ${normalize(value)} `;
  return (
    getBlockedWords().find((word) => content.includes(` ${word} `)) || null
  );
};

module.exports = { findBlockedWord };
