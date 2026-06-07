import Joi from "joi";

export const authValidation = {
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
    }),

    register: Joi.object({
        name: Joi.string().min(2).required(),
        username: Joi.string().min(3).max(30).alphanum().lowercase().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
    }),

    forgotPassword: Joi.object({
        email: Joi.string().email().required(),
    }),

    resetPassword: Joi.object({
        token: Joi.string().required(),
        password: Joi.string().min(6).required(),
    }),

    verify2FA: Joi.object({
        code: Joi.string().min(6).max(10).required(),
    }),

    verifyLogin2FA: Joi.object({
        token: Joi.string().required(),

        code: Joi.string(),
        recovery_code: Joi.string(),
    }).xor("code", "recovery_code"),
};