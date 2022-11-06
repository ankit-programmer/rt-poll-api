import admin from '../configs/firebase';
import { NextFunction, Request, RequestHandler, RequestParamHandler, Response } from 'express';
import { ApiError } from '../errors/api-error';
import logger from '../logger';
export function authenticate(req: Request, res: Response, next: NextFunction) {
    let token = req.header('Authorization') ? req.header('Authorization')?.replace('Bearer ', '') : req.query.token?.toString();
    if (token) {
        admin.auth().verifyIdToken(token, false).then(async (payload: any) => {
            // res.locals is an object which can store intermediate values for the given request. http://expressjs.com/en/api.html#res.locals
            res.locals.user = payload;
            next();
        }).catch((error: any) => {
            logger.error(error.code);
            logger.error(error);
            switch (error.code) {
                case 'auth/id-token-expired':
                    next(new ApiError('Token has expired. Please try with a fresh token.', 401));
                    break;

                default:
                    next(new ApiError('Authentication failed. Please authenticate yourself.', 401));
                    break;
            }

        });

    } else {
        logger.error("Token not found");
        next(new ApiError('Token not found', 401));
    }

}
