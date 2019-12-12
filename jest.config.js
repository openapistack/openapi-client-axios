
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [ '**/?(*.)+(spec|test).ts' ],
  transformIgnorePatterns: [],
  transform: {
    "^.+\\.js?$": './jest.transformer'
  }
};
