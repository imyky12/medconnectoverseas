import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError';

/**
 * Runs an array of express-validator chains and throws ApiError if validation fails.
 * Usage: router.post('/signup', validate(signupRules), controller.signup)
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((err) => ({
        field: 'path' in err ? err.path : 'unknown',
        message: err.msg,
      }));

      next(new ApiError(400, 'Validation failed', formattedErrors));
      return;
    }

    next();
  };
};
