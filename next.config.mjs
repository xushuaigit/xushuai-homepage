const configuredBasePath = process.env.PAGES_BASE_PATH ?? '/xushuai-homepage';
export const pagesBasePath = configuredBasePath === '/' ? '' : configuredBasePath.replace(/\/$/u, '');

if (pagesBasePath && !/^\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*$/u.test(pagesBasePath)) {
  throw new Error('PAGES_BASE_PATH must be empty or a path such as /xushuai-homepage.');
}

/** @type {import('vinext').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '',
  assetPrefix: `https://xushuaigit.github.io${pagesBasePath}`,
};

export default nextConfig;
