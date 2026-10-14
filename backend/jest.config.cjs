/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',

  testEnvironment: 'node',

  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },

  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  testRegex: '.*\\.spec\\.ts$',

  moduleFileExtensions: ['ts', 'js', 'json'],

  collectCoverageFrom: ['src/**/*.ts'],

  coverageDirectory: './coverage',
};
