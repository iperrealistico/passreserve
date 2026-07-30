import {
  getPassreserveStaticHeaderRules
} from "./lib/passreserve-http-security.js";

/** @type {import("next").NextConfig} */
const nextConfig = {
  async headers() {
    return getPassreserveStaticHeaderRules();
  }
};

export default nextConfig;
