import { Router } from 'express';
import { validateBody } from '../validation/schemas';
import { chatMessageSchema } from '../validation/schemas';
import { aiRateLimit } from '../middleware/rateLimiting';
import { generateAIResponse } from '../services/perplexity';
import { storage } from '../storage';

const router = Router();

// AI Chat - public access with rate limiting
router.post('/', aiRateLimit, validateBody(chatMessageSchema), async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    const response = await generateAIResponse(message);
    
    await storage.saveChatMessage({
      sessionId: sessionId || `session_${Date.now()}`,
      role: "user",
      content: message,
      createdAt: new Date(),
    });

    await storage.saveChatMessage({
      sessionId: sessionId || `session_${Date.now()}`,
      role: "assistant",
      content: typeof response === 'string' ? response : (response as any)?.message || 'Response generated',
      createdAt: new Date(),
    });

    res.json({
      response: typeof response === 'string' ? response : (response as any)?.message || 'Response generated',
      sessionId: sessionId || `session_${Date.now()}`,
    });
  } catch (error) {
    console.error("Error in chat:", error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

export default router;