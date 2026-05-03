import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

const frontendDistCandidates = [
  path.resolve(process.cwd(), "artifacts", "mycarqr", "dist"),
  path.resolve(process.cwd(), "..", "mycarqr", "dist"),
  path.resolve(moduleDir, "..", "..", "mycarqr", "dist"),
];

const frontendDistDir = frontendDistCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "index.html")),
);

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

// In production, restrict CORS to an allowlist. Sources, in priority order:
//   1. CORS_ORIGIN env var (comma-separated, e.g. "https://mycarqr.app").
//   2. REPLIT_DOMAINS env var (always set by Replit on deployed apps),
//      converted into "https://<domain>" entries.
//   3. Empty allowlist -> same-origin only (cors origin:false). The SPA and
//      the API are served from the same Replit proxy domain, so same-origin
//      requests still work; only cross-origin browsers are blocked.
// We deliberately never use `origin: true` with `credentials: true` in
// production because that would let any site make authenticated cross-origin
// requests against the API. We also never throw at startup -- a startup crash
// blocks publishing entirely, which is worse than a missing CORS allowlist.
const explicitCorsAllowlist = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const replitDomainsAllowlist = (process.env.REPLIT_DOMAINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((d) => `https://${d}`);
const corsAllowlist =
  explicitCorsAllowlist.length > 0
    ? explicitCorsAllowlist
    : replitDomainsAllowlist;
if (process.env.NODE_ENV === "production" && corsAllowlist.length === 0) {
  logger.warn(
    "CORS_ORIGIN and REPLIT_DOMAINS are both unset in production; cross-origin requests will be blocked. Set CORS_ORIGIN explicitly to allow specific origins.",
  );
}
app.use(
  cors({
    credentials: true,
    origin:
      process.env.NODE_ENV === "production"
        ? corsAllowlist.length > 0
          ? corsAllowlist
          : false
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
app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

if (frontendDistDir) {
  logger.info({ frontendDistDir }, "Serving frontend static build");

  app.use(express.static(frontendDistDir));
  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith(CLERK_PROXY_PATH)) {
      next();
      return;
    }

    res.sendFile(path.join(frontendDistDir, "index.html"));
  });
} else {
  logger.warn(
    { frontendDistCandidates },
    "Frontend build not found; root route will return status message",
  );

  app.get("/", (_req, res) => {
    res.status(200).send("Server is running");
  });
}

export default app;
