// validations/group.validation.ts
import Joi from "joi"

export const groupValidation = {

    createGroup: Joi.object({
        name: Joi.string().min(1).max(100).required().messages({
            "string.empty": "Group name is required",
            "string.max": "Group name must be at most 100 characters",
        }),
        description: Joi.string().max(255).optional().allow("", null),
        avatar: Joi.string().uri().optional().allow("", null),
        join_mode: Joi.string().valid("open", "approval").optional().default("open"),
    }),

    updateGroup: Joi.object({
        name: Joi.string().min(1).max(100).optional(),
        description: Joi.string().max(255).optional().allow("", null),
        avatar: Joi.string().uri().optional().allow("", null),
        join_mode: Joi.string().valid("open", "approval").optional(),
    }).min(1).messages({
        "object.min": "At least one field is required to update"
    }),

    addMember: Joi.object({
        user_id: Joi.number().integer().positive().required().messages({
            "number.base": "User ID must be a number",
            "any.required": "User ID is required",
        }),
        role: Joi.string().valid("admin", "member").optional().default("member"),
    }),

    updateMemberRole: Joi.object({
        role: Joi.string().valid("admin", "member").required().messages({
            "any.only": "Role must be either admin or member",
            "any.required": "Role is required",
        }),
    }),

    updateSettings: Joi.object({
        who_can_send: Joi.string().valid("members", "admins").optional(),
        who_can_edit_info: Joi.string().valid("admins", "members").optional(),
        who_can_add_members: Joi.string().valid("admins", "members").optional(),
        who_can_remove_members: Joi.string().valid("admins").optional(),
        who_can_share_link: Joi.string().valid("admins", "members").optional(),
        who_can_change_settings: Joi.string().valid("admins").optional(),
    }).min(1).messages({
        "object.min": "At least one setting is required to update"
    }),

    reviewJoinRequest: Joi.object({
        status: Joi.string().valid("approved", "rejected").required().messages({
            "any.only": "Status must be approved or rejected",
            "any.required": "Status is required",
        }),
    }),
}