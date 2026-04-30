import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// In production, restrict CORS to a comma-separated allowlist from CORS_ORIGIN
// (e.g. "https://mycarqr.app,https://www.mycarqr.app"). In dev (or if the env
// var is unset) we reflect the request origin so Replit previews + localhost
// keep working.
const corsAllowlist = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (process.env.NODE_ENV === "production" && corsAllowlist.length === 0) {
  // Reflecting `origin: true` with `credentials: true` would allow any site to
  // make authenticated cross-origin requests against the API, which is unsafe.
  // Refuse to start so the operator notices and sets CORS_ORIGIN explicitly.
  throw new Error(
    "CORS_ORIGIN must be set in production (comma-separated list of allowed frontend origins, e.g. \"https://mycarqr.app,https://www.mycarqr.app\").",
  );
}
app.use(
  cors({
    credentials: true,
    origin:
      process.env.NODE_ENV === "production" && corsAllowlist.length > 0
        ? corsAllowlist
        : true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
