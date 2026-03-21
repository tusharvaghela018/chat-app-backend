import Joi from "joi";

export const messageValidation = {
    getMessages: {
        params: Joi.object({
            receiverId: Joi.number().integer().positive().required(),
        }),
    },
};