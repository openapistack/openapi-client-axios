import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.[tj]s?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
}

export default jestConfig