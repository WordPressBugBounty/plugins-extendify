import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCSSExtractPlugin from 'mini-css-extract-plugin';
import base from './webpack.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Externalizing @wordpress/* is what makes a bundle need WordPress to boot.
// The manifest and cleaner would rewrite and empty the plugin's own build dir.
const DROP = [
	'DependencyExtractionWebpackPlugin',
	'WebpackAssetsManifest',
	'CleanWebpackPlugin',
	// Two instances emit the stylesheet twice, once under a hash nothing reads.
	'MiniCssExtractPlugin',
	'MiniCSSExtractPlugin',
];

// Each designer is its own folder on extendify.com, so each build carries its own chunks.
const designer = (tool, pages) => ({
	...base,
	entry: { designer: `./src/Designer/${tool}.js` },
	output: {
		filename: '[name].js',
		path: resolve(__dirname, 'designer-dist', tool),
		publicPath: './',
		clean: true,
	},
	plugins: [
		...base.plugins.filter((p) => !DROP.includes(p.constructor.name)),
		new MiniCSSExtractPlugin({ filename: '[name].css' }),
		new CopyPlugin({
			patterns: [
				{ from: `src/Designer/${tool}.html`, to: 'index.html' },
				...pages,
			],
		}),
	],
	optimization: {
		...base.optimization,
		runtimeChunk: false,
		splitChunks: false,
	},
});

export default [
	designer('launch-designer', [
		{
			from: 'src/Designer/old-address.html',
			to: '../extendify-designer/index.html',
		},
	]),
	designer('agent-designer', [
		{ from: 'src/Designer/agent/site.html', to: 'site.html' },
	]),
];
