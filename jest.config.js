module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    "^.+\\.(t|j)sx?$": "ts-jest"
  },
  testMatch: [
    "**/test/**/*.spec.ts",
    "**/test/**/*.spec.tsx"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"]
};

