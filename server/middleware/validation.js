// middleware/validation.js
import Joi from 'joi';

const get_schemas = {
  '/messages': Joi.object({
    since: Joi.string(),
    location: Joi.string()
  }),
  '/messages/mention': Joi.object({
    name: Joi.string().required(),
    since: Joi.string()
  })
};
const post_schemas = {
  '/messages': Joi.object({
    id: Joi.string(),
    author: Joi.object({
      id: Joi.string().required(),
      username: Joi.string().required(),
      discriminator: Joi.string(),
      avatar: Joi.string()
    }),
    content: Joi.string(),
    createdAt: Joi.date(),
    threadId: Joi.string(),
    channelId: Joi.string().required(),
    guildId: Joi.string().required()
  }),
  '/enqueue': Joi.object({
    action: Joi.string().required(),
    data: Joi.object().required()
  }),
  '/thread': Joi.object({
    threadName: Joi.string().required(),
    channelId: Joi.string()
  })
};

export const validateRequest = (req, res, next) => {
  const schema = req.method === 'GET' ? get_schemas[req.path] : post_schemas[req.path];
  if (schema) {
    const dataToValidate = req.method === 'GET' ? req.query : req.body;
    const { error } = schema.validate(dataToValidate);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
  }
  next();
};