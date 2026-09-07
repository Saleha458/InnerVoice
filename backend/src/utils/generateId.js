const adjectives = [
  "quiet",
  "calm",
  "gentle",
  "silent",
  "brave",
  "peaceful",
  "hidden",
  "hopeful",
];

const nouns = [
  "soul",
  "heart",
  "voice",
  "moon",
  "star",
  "cloud",
  "mind",
  "spirit",
];

const generateAnonymousId = () => {
  const adjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];

  const noun =
    nouns[Math.floor(Math.random() * nouns.length)];

  const number = Math.floor(100 + Math.random() * 900);

  return `${adjective}_${noun}_${number}`;
};

module.exports = generateAnonymousId;