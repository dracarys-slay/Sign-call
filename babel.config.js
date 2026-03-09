/**
 * babel.config.js
 *
 * Required by Jest to transpile TypeScript/JSX source files.
 * Uses the babel-preset-expo preset (bundled with Expo) which sets up
 * TypeScript, JSX, and React Native transforms in one step.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
