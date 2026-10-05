import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "production") {
    next();
    return;
  }

  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;
    const duration = Date.now() - start;
    console.log(`[${req.method} ${path} ${res.statusCode} ${duration}ms]`);
  });

  next();
}
