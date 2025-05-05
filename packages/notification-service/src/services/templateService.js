const { NotificationTemplate } = require("../lib/database");
const { metrics } = require("../lib/metrics");
const Handlebars = require("handlebars");
const moment = require("moment-timezone");

class TemplateService {
  constructor() {
    // Register common helpers
    Handlebars.registerHelper("formatDate", (date, format, timezone) => {
      return moment(date).tz(timezone).format(format);
    });

    Handlebars.registerHelper("formatCurrency", (amount, currency) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
      }).format(amount);
    });
  }

  async getTemplate(type, channel, language = "en") {
    try {
      const template = await NotificationTemplate.findOne({
        type,
        channel,
        language,
        isActive: true,
      });

      if (!template) {
        throw new Error(
          `Template not found for type: ${type}, channel: ${channel}, language: ${language}`
        );
      }

      return template;
    } catch (error) {
      console.error("Error fetching template:", error);
      metrics.templateError.inc({ operation: "get" });
      throw error;
    }
  }

  async createTemplate(templateData) {
    try {
      const template = await NotificationTemplate.create(templateData);
      metrics.templateCreated.inc();
      return template;
    } catch (error) {
      console.error("Error creating template:", error);
      metrics.templateError.inc({ operation: "create" });
      throw error;
    }
  }

  async updateTemplate(templateId, updates) {
    try {
      const template = await NotificationTemplate.findByIdAndUpdate(
        templateId,
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!template) {
        throw new Error(`Template not found with id: ${templateId}`);
      }

      metrics.templateUpdated.inc();
      return template;
    } catch (error) {
      console.error("Error updating template:", error);
      metrics.templateError.inc({ operation: "update" });
      throw error;
    }
  }

  async deactivateTemplate(templateId) {
    try {
      const template = await NotificationTemplate.findByIdAndUpdate(
        templateId,
        {
          $set: {
            isActive: false,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!template) {
        throw new Error(`Template not found with id: ${templateId}`);
      }

      metrics.templateDeactivated.inc();
      return template;
    } catch (error) {
      console.error("Error deactivating template:", error);
      metrics.templateError.inc({ operation: "deactivate" });
      throw error;
    }
  }

  async renderTemplate(type, channel, data, language = "en", timezone = "UTC") {
    try {
      const template = await this.getTemplate(type, channel, language);
      const compiledTemplate = Handlebars.compile(template.body);

      // Add common data
      const templateData = {
        ...data,
        timezone,
        language,
        currentDate: new Date(),
      };

      const renderedContent = compiledTemplate(templateData);

      metrics.templateRendered.inc({ type, channel });
      return {
        subject: template.subject
          ? Handlebars.compile(template.subject)(templateData)
          : null,
        body: renderedContent,
      };
    } catch (error) {
      console.error("Error rendering template:", error);
      metrics.templateError.inc({ operation: "render" });
      throw error;
    }
  }

  async validateTemplateVariables(template) {
    try {
      const compiledTemplate = Handlebars.compile(template.body);
      const variables = new Set();

      // Extract variables from template
      const ast = Handlebars.parse(template.body);
      ast.body.forEach((node) => {
        if (
          node.type === "MustacheStatement" ||
          node.type === "BlockStatement"
        ) {
          if (node.path && node.path.parts) {
            node.path.parts.forEach((part) => {
              if (part !== "this") {
                variables.add(part);
              }
            });
          }
        }
      });

      return Array.from(variables);
    } catch (error) {
      console.error("Error validating template variables:", error);
      metrics.templateError.inc({ operation: "validate" });
      throw error;
    }
  }

  async bulkCreateTemplates(templates) {
    try {
      const createdTemplates = await NotificationTemplate.insertMany(templates);
      metrics.templateBulkCreated.inc({ count: templates.length });
      return createdTemplates;
    } catch (error) {
      console.error("Error bulk creating templates:", error);
      metrics.templateError.inc({ operation: "bulk_create" });
      throw error;
    }
  }
}

module.exports = TemplateService;
