/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',

  // Change links `/me` -> `/me/` and emit `/me.html` -> `/me/index.html`
  trailingSlash: true,
}

export default nextConfig
