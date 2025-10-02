import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';

export default {
  input: 'scripts/cytoscape-visualizer.tsx',
  output: {
    file: 'scripts/cytoscape-visualizer.js',
    format: 'iife', // Use IIFE format for browser compatibility
    name: 'CytoscapeVisualizer', // A global variable name for your bundle
    sourcemap: true,
  },
  plugins: [
    json(),
    babel({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-react'],
      plugins: ['@babel/plugin-transform-react-jsx'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      exclude: 'node_modules/**',
    }),
    typescript({
      tsconfig: './scripts/tsconfig.json',
      jsx: 'react-jsx', // Keep for type checking, Babel handles actual transform
    }),
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs({
      include: /node_modules/, // Aggressively convert all node_modules to ES modules
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify('development'),
      preventAssignment: true,
    }),
  ],
  external: ['react', 'react-dom', '@mui/material'],
  output: {
    file: 'scripts/cytoscape-visualizer.js',
    format: 'iife', // Use IIFE format for browser compatibility
    name: 'CytoscapeVisualizer', // A global variable name for your bundle
    sourcemap: true,
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
      '@mui/material': 'MaterialUI',
    },
  },
};