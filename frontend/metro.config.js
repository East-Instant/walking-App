const { getDefaultConfig } = require('expo/metro-config');
const { apiProxy } = require('./dev/api-proxy.cjs');

const config = getDefaultConfig(__dirname);
const enhance = config.server.enhanceMiddleware;
const proxy = apiProxy(process.env.WALKING_API_PROXY_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000');
config.server.enhanceMiddleware = (middleware, server) => {
  const next = enhance ? enhance(middleware, server) : middleware;
  return (req, res, done) => proxy(req, res, () => next(req, res, done));
};
module.exports = config;
