import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import {
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
  createAuthToken,
  getUserByToken,
  deleteAuthToken,
  getOrCreateQrCode,
  getQrCodeById,
  getQrCodeComments,
  addComment,
  getQrCodeReports,
  addReport,
  getUserReport,
  recordScan,
  getUserScans,
  getTotalScans,
  getTotalComments,
  decodeQrFromImage,
} from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";

interface AuthRequest extends Request {
  user?: { id: string; email: string; displayName: string };
}

async function authMiddleware(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = await getUserByToken(token);
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      };
    }
  }
  next();
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function detectContentType(content: string): string {
  try {
    new URL(content);
    return "url";
  } catch {
    if (content.startsWith("tel:")) return "phone";
    if (content.startsWith("mailto:")) return "email";
    if (content.startsWith("WIFI:")) return "wifi";
    if (content.startsWith("geo:")) return "location";
    return "text";
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", authMiddleware as any);

  app.post("/api/auth/register", async (req: AuthRequest, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { email, displayName, password } = parsed.data;
      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }
      const user = await createUser(email, displayName, password);
      const token = await createAuthToken(user.id);
      res.json({
        user: { id: user.id, email: user.email, displayName: user.displayName },
        token,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/auth/login", async (req: AuthRequest, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const { email, password } = parsed.data;
      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await verifyPassword(user, password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const token = await createAuthToken(user.id);
      res.json({
        user: { id: user.id, email: user.email, displayName: user.displayName },
        token,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/auth/me", async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });
    res.json({ user: req.user });
  });

  app.post("/api/auth/logout", async (req: AuthRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      await deleteAuthToken(authHeader.slice(7));
    }
    res.json({ success: true });
  });

  app.post("/api/qr/scan", async (req: AuthRequest, res: Response) => {
    try {
      const { content, isAnonymous } = req.body;
      if (!content) return res.status(400).json({ message: "Content required" });
      const contentType = detectContentType(content);
      const qr = await getOrCreateQrCode(content, contentType);
      if (req.user && !isAnonymous) {
        await recordScan(qr.id, req.user.id, false);
      } else if (req.user && isAnonymous) {
        await recordScan(qr.id, req.user.id, true);
      }
      const reportCounts = await getQrCodeReports(qr.id);
      const totalScans = await getTotalScans(qr.id);
      const totalComments = await getTotalComments(qr.id);
      res.json({ qrCode: qr, reportCounts, totalScans, totalComments });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/qr/decode-image", async (req: AuthRequest, res: Response) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) return res.status(400).json({ message: "Image required" });
      const content = await decodeQrFromImage(imageBase64);
      if (!content) return res.status(404).json({ message: "No QR code found in image" });
      res.json({ content });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/qr/:id", async (req: AuthRequest, res: Response) => {
    try {
      const qr = await getQrCodeById(req.params.id);
      if (!qr) return res.status(404).json({ message: "QR code not found" });
      const reportCounts = await getQrCodeReports(qr.id);
      const totalScans = await getTotalScans(qr.id);
      const totalComments = await getTotalComments(qr.id);
      let userReport = null;
      if (req.user) {
        userReport = await getUserReport(qr.id, req.user.id);
      }
      res.json({ qrCode: qr, reportCounts, totalScans, totalComments, userReport });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/qr/:id/comments", async (req: AuthRequest, res: Response) => {
    try {
      const isGuest = !req.user;
      const limit = isGuest ? 6 : undefined;
      const allComments = await getQrCodeComments(req.params.id, limit);
      const totalComments = await getTotalComments(req.params.id);
      res.json({ comments: allComments, total: totalComments, limited: isGuest });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post(
    "/api/qr/:id/comments",
    requireAuth as any,
    async (req: AuthRequest, res: Response) => {
      try {
        const { text } = req.body;
        if (!text || !text.trim()) return res.status(400).json({ message: "Comment text required" });
        const comment = await addComment(req.params.id, req.user!.id, text.trim());
        res.json({ comment });
      } catch (e: any) {
        res.status(500).json({ message: e.message });
      }
    }
  );

  app.post(
    "/api/qr/:id/report",
    requireAuth as any,
    async (req: AuthRequest, res: Response) => {
      try {
        const { reportType } = req.body;
        const validTypes = ["scam", "fake", "spam", "safe"];
        if (!validTypes.includes(reportType)) {
          return res.status(400).json({ message: "Invalid report type" });
        }
        const report = await addReport(req.params.id, req.user!.id, reportType);
        const reportCounts = await getQrCodeReports(req.params.id);
        res.json({ report, reportCounts });
      } catch (e: any) {
        res.status(500).json({ message: e.message });
      }
    }
  );

  app.get(
    "/api/user/history",
    requireAuth as any,
    async (req: AuthRequest, res: Response) => {
      try {
        const history = await getUserScans(req.user!.id);
        res.json({ history });
      } catch (e: any) {
        res.status(500).json({ message: e.message });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
