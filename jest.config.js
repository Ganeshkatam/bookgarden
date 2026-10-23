module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testTimeout: 10000,
  setupFiles: ["<rootDir>/jest.env.js"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: [
    "**/modules/**/?(*.)+(spec|test).[jt]s?(x)",
    "**/shared/**/?(*.)+(spec|test).[jt]s?(x)",
    "**/components/**/?(*.)+(spec|test).[jt]s?(x)",
    "**/app/**/?(*.)+(spec|test).[jt]s?(x)"
  ],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/tests/"],
  moduleNameMapper: {
    // Handle module aliases
    "^@/(.*)$": "<rootDir>/$1",
    "^pdfjs-dist$": "<rootDir>/tests/mocks/pdfjsMock.js",
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
};
