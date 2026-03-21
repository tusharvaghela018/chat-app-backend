import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { sendResponse } from "@/utils";

type ValidationType = "body" | "query" | "params";

class ValidationMiddleware {
    validate(schema: Joi.ObjectSchema, type: ValidationType = "body") {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                const data = req[type];

                const { error, value } = schema.validate(data, {
                    abortEarly: false,  // collect all errors at once
                    stripUnknown: true, // remove fields not in schema
                });

                if (error) {
                    const errors = error.details.map((err) => ({
                        field: err.path.join("."),
                        message: err.message.replace(/['"]/g, ""),
                    }));

                    sendResponse({
                        res,
                        statusCode: 400,
                        success: false,
                        message: errors[0]?.message || "Validation failed",
                        error: errors,
                        show_toast: true,
                    });
                    return;
                }

                req[type] = value;
                next();
            } catch (err) {
                next(err);
            }
        };
    }

    body(schema: Joi.ObjectSchema) {
        return this.validate(schema, "body");
    }

    query(schema: Joi.ObjectSchema) {
        return this.validate(schema, "query");
    }

    params(schema: Joi.ObjectSchema) {
        return this.validate(schema, "params");
    }
}

export default ValidationMiddleware;