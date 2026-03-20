import { Router, Request, Response } from 'express';
import { checkConsistency } from '../services/rulesService';

const router = Router();

// 本地一致性检查
router.post('/check-consistency', (req: Request, res: Response) => {
  const { project } = req.body;

  try {
    const result = checkConsistency(project);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      errors: [],
      warnings: [],
      info: [],
      summary: `检查失败: ${error.message}`,
    });
  }
});

export default router;
