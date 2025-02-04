import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { db } from "@db";
import { products, chats, messages, type InsertProduct } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';


// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Products
  app.get("/api/products", async (req, res) => {
    const allProducts = await db.query.products.findMany({
      with: {
        farmer: true,
      },
      orderBy: desc(products.createdAt),
    });
    res.json(allProducts);
  });

  app.get("/api/products/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        farmer: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  });

  app.post("/api/products", upload.single('image'), async (req: Request<{}, {}, InsertProduct>, res) => {
    if (!req.user || req.user.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can create products" });
    }

    try {
      const productData = {
        ...req.body,
        price: parseFloat(req.body.price),
        quantity: parseInt(req.body.quantity),
        farmerId: req.user.id,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined
      };

      const [product] = await db
        .insert(products)
        .values([productData])
        .returning();

      res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Chats
  app.get("/api/chats", async (req, res) => {
    if (!req.user) return res.sendStatus(401);

    const userChats = await db.query.chats.findMany({
      where: req.user.role === "farmer"
        ? eq(chats.farmerId, req.user.id)
        : eq(chats.buyerId, req.user.id),
      with: {
        buyer: true,
        farmer: true,
        product: true,
        messages: {
          orderBy: desc(messages.createdAt),
          limit: 50,
        },
      },
    });
    res.json(userChats);
  });

  app.post("/api/chats", async (req, res) => {
    if (!req.user || req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can start chats" });
    }

    const { farmerId, productId } = req.body;
    const [existingChat] = await db
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.buyerId, req.user.id),
          eq(chats.farmerId, farmerId),
          eq(chats.productId, productId)
        )
      )
      .limit(1);

    if (existingChat) {
      return res.json(existingChat);
    }

    const [chat] = await db
      .insert(chats)
      .values({
        buyerId: req.user.id,
        farmerId,
        productId,
      })
      .returning();
    res.status(201).json(chat);
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const clients = new Map<number, WebSocket>();

  wss.on('connection', (ws, req) => {
    if (!req.url) return ws.close();

    const userId = parseInt(new URL(req.url, 'http://localhost').searchParams.get('userId') || '');
    if (isNaN(userId)) return ws.close();

    clients.set(userId, ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const [savedMessage] = await db
          .insert(messages)
          .values({
            chatId: message.chatId,
            senderId: userId,
            content: message.content,
          })
          .returning();

        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, message.chatId),
        });

        if (chat) {
          [chat.buyerId, chat.farmerId].forEach((recipientId) => {
            const recipient = clients.get(recipientId);
            if (recipient?.readyState === WebSocket.OPEN) {
              recipient.send(JSON.stringify(savedMessage));
            }
          });
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(userId);
    });
  });

  return httpServer;
}