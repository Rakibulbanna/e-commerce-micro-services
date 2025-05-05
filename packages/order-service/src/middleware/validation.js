const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateRequest = (schema) => {
  return (req, res, next) => {
    const validate = ajv.compile(schema);
    const valid = validate(req.body);

    if (!valid) {
      return res.status(400).json({
        error: "Validation failed",
        details: validate.errors,
      });
    }

    next();
  };
};

module.exports = {
  validateRequest,
};
