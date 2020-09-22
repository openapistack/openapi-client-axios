module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [ '**/?(*.)+(spec|test).ts?(x)' ],
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.test.json',
    },
  },
};
