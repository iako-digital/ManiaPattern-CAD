/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // paper's default "main" build (paper-full.js) drags in a Node.js/jsdom
    // fallback path that webpack tries to resolve even for client-only usage.
    // paper-core.js is the browser build and has no such dependency.
    config.resolve.alias["paper$"] = require.resolve("paper/dist/paper-core.js");
    // Next's server (Node target) compiler doesn't honor package.json "browser"
    // field remaps, so replicate paper's own remaps to strip its node-only path.
    config.resolve.alias["./node/self.js$"] = false;
    config.resolve.alias["./node/extend.js$"] = false;
    config.resolve.alias["canvas"] = false;
    config.resolve.alias["jsdom"] = false;
    config.resolve.alias["jsdom/lib/jsdom/living/generated/utils"] = false;
    return config;
  },
};

module.exports = nextConfig;
