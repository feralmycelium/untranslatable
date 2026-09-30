import { handleApi } from "./api.js";

export default {
  fetch(request, env) {
    return new URL(request.url).pathname.startsWith("/api/") ? handleApi(request, env.DB) : env.ASSETS.fetch(request);
  },
};
