import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

// Validates the request body (and optionally params/query). On failure a 400
// with a machine-readable issue list is returned; on success the validated
// (and sanitized) values replace req.body / req.params / req.query.
export const validate = (schema: ZodSchema, sources: ('body' | 'params' | 'query')[] = ['body']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const source of sources) {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        return res.status(400).json({
          error: 'Invalid request payload',
          issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        });
      }
      if (source === 'body') {
        req.body = result.data;
      } else {
        // Express 5 exposes req.params as a getter, so merge parsed values into
        // the existing object instead of replacing the reference.
        Object.assign(req[source], result.data);
      }
    }
    next();
  };
};
