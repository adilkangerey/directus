import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { findPackageRoot } from './find-package-root.js';

vi.mock('node:fs/promises', () => {
	return {
		stat: vi.fn().mockImplementation(async (path) => {
			if (path === join(process.cwd(), 'package.json')) {
				return { isFile: () => true };
			}

			throw new Error();
		}),
	};
});

describe('findPackageRoot', () => {
	it.each(['src/test', 'src', '.'])(`finds package root for '%s'`, async (insidePackagePath: string) => {
		const sourcePath = join(process.cwd(), ...insidePackagePath.split('/'));
		const packageRoot = await findPackageRoot(sourcePath);

		expect(packageRoot).toBe(process.cwd());
	});
});
