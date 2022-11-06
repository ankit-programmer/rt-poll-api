import { NextFunction, Request, Response } from "express";
import { ApiError } from "../errors/api-error";
import logger from "../logger";


export default function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    if (err instanceof ApiError) {
        return res.status(err.code).json({ status: 'error', message: err.message, code: err.code });
    }
    // Default action for errors that are not handled.
    logger.error(err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error', code: 500 });
}