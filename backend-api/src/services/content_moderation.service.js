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
    .normalize("NFC")
    .toLocaleLowerCase("vi")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
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
