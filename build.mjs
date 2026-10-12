// Generates dist/tokens.css from tokens.json (Style Dictionary).
//
//   npm run build
//
// Each token names its own CSS custom property in $extensions["com.toy.css"].name,
// kept separate from the token's JSON path, so reorganizing tokens.json never
// renames a var() already used in CSS. Aliases ({color.blue.500}) are resolved
// by Style Dictionary and written back out as var(--blue-500) so the cascade
// still works and the build fails loudly if a reference points nowhere.
import StyleDictionary from 'style-dictionary';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const HEADER = '/* Generated from tokens.json — do not edit by hand */';
const EXTENSION = 'com.toy.css';

const cssName = (token) => token.$extensions[EXTENSION].name;

/** Resolve a token's own value to CSS text: var(--x) for an alias, the literal otherwise. */
function cssValue(token, byPath) {
	const value = token.original.$value;
	if (typeof value === 'string' && /^\{.+\}$/.test(value)) {
		const target = byPath.get(value.slice(1, -1));
		return `var(${cssName(target)})`;
	}
	return String(value);
}

StyleDictionary.registerFormat({
	name: 'toy/css',
	format: ({ dictionary, file }) => {
		const { blocks } = file.options;
		const byPath = new Map(dictionary.allTokens.map((token) => [token.path.join('.'), token]));
		const out = [HEADER];
		for (const block of blocks) {
			const tokens = dictionary.allTokens.filter(block.filter);
			const lines = tokens.map((token) => `\t${cssName(token)}: ${cssValue(token, byPath)};`);
			out.push(`${block.selector} {\n${lines.join('\n')}\n}`);
		}
		return `${out.join('\n\n')}\n`;
	}
});

const sd = new StyleDictionary({
	source: [join(here, 'tokens.json')],
	usesDtcg: true,
	log: { errors: { brokenReferences: 'throw' } },
	platforms: {
		css: {
			transforms: ['name/kebab'],
			buildPath: `${here}/dist/`,
			files: [
				{
					destination: 'tokens.css',
					format: 'toy/css',
					options: {
						blocks: [
							{
								selector: ':root',
								// tier 1 palette + tier 2 light semantic aliases
								filter: (t) =>
									t.path[0] === 'color' ||
									(t.path[0] === 'semantic' && t.path[1] === 'light')
							},
							{
								selector: ":root[data-theme='dark']",
								// dark overrides for the tier 2 names only
								filter: (t) => t.path[0] === 'semantic' && t.path[1] === 'dark'
							}
						]
					}
				}
			]
		}
	}
});

await sd.buildAllPlatforms();

// Cache-bust the stylesheet link so a plain browser reload always picks up
// the new build, instead of a stale cached tokens.css.
const indexPath = join(here, 'index.html');
const index = readFileSync(indexPath, 'utf8');
const stamped = index.replace(
	/dist\/tokens\.css(?:\?v=\d+)?/,
	`dist/tokens.css?v=${Date.now()}`
);
writeFileSync(indexPath, stamped);

console.log('Built dist/tokens.css');
