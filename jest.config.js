/** @type {import('jest').Config} */
export default {
	projects: [
		{
			displayName: "src",
			testEnvironment: "jsdom",
			testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
			setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
			transform: {
				"^.+\\.tsx?$": ["ts-jest", {
					tsconfig: {
						jsx: "react-jsx",
						module: "ESNext",
						moduleResolution: "bundler",
						esModuleInterop: true,
						types: ["jest", "@testing-library/jest-dom", "node"],
						paths: { "*": ["./src/*"] },
					},
				}],
			},
			moduleNameMapper: {
				"^fidgets/(.*)\\.(png|svg|ico|webp|mp3)$": "<rootDir>/src/__mocks__/fileMock.js",
				"^components/(.*)$": "<rootDir>/src/components/$1",
				"^bridge/(.*)$": "<rootDir>/src/bridge/$1",
				"^fidgets/(.*)$": "<rootDir>/src/fidgets/$1",
				"^lib/(.*)$": "<rootDir>/src/lib/$1",
				"^screens/(.*)$": "<rootDir>/src/screens/$1",
				"^themes$": "<rootDir>/src/themes/index",
				"^types/(.*)$": "<rootDir>/src/types/$1",
				"^classes/(.*)$": "<rootDir>/src/classes/$1",
				"\\.(scss|css)$": "<rootDir>/src/__mocks__/styleMock.js",
				"\\.(png|svg|ico|webp|mp3)$": "<rootDir>/src/__mocks__/fileMock.js",
			},
		},
		{
			displayName: "dev",
			testEnvironment: "node",
			testMatch: ["<rootDir>/dev/__tests__/**/*.test.ts"],
			transform: {
				"^.+\\.ts$": ["ts-jest", {
					tsconfig: {
						module: "nodenext",
						moduleResolution: "nodenext",
						esModuleInterop: true,
						target: "ES2022",
						types: ["jest", "node"],
						allowJs: true,
					},
				}],
			},
		},
	],
};
