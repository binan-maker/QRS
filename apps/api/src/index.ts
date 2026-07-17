import express from "express";
import { startScheduler } from "./scheduler";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerHealthEndpoints } from "./health-check";
import { signApiResponses } from "./security/sign-middleware";
import { corsMiddleware } from "./middleware/cors";
import { requestLogger } from "./middleware/request-logger";
import { errorHandler } from "./middleware/error-handler";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "apps",
    "api",
    "src",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  const webBuildDir = path.resolve(process.cwd(), "web-build");
  const webIndexHtml = path.join(webBuildDir, "index.html");
  const hasWebBuild = fs.existsSync(webIndexHtml);

  log("Serving static Expo files with dynamic manifest routing");
  if (hasWebBuild) {
    log("Web build found — serving web app to browsers");
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      if (req.path === "/" || req.path === "/manifest") {
        return serveExpoManifest(platform, res);
      }
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  if (hasWebBuild) {
    app.use(express.static(webBuildDir));

    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      if (req.header("expo-platform")) {
        return next();
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.sendFile(webIndexHtml);
    });
  } else {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      if (req.header("expo-platform")) {
        return next();
      }
      return serveLandingPage({ req, res, landingPageTemplate, appName });
    });
  }

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupCspHeaders(app: express.Application) {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https: data:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss: ws:; media-src 'self' blob: https:; object-src 'none'; frame-ancestors 'none'"
    );
    next();
  });
}

(async () => {
  app.use(corsMiddleware);
  setupCspHeaders(app);
  setupBodyParsing(app);
  app.use(requestLogger);

  // SECURITY FIX P1: Auto-sign every successful /api/* JSON response (ECDSA P-256).
  // Must run BEFORE routes register their handlers so the wrapper is in place
  // by the time res.json() is invoked.
  app.use(signApiResponses);

  const server = await registerRoutes(app);

  // Register health check and monitoring endpoints
  registerHealthEndpoints(app);

  // Static file serving MUST come after routes so /go/:slug and /guard/:slug
  // are handled by Express before the catch-all serves index.html.
  configureExpoAndLanding(app);

  app.use(errorHandler);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
      startScheduler();
    },
  );
})();
