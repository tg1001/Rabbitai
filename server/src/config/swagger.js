const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RabbitAI — Sales Report Generator API',
      version: '1.0.0',
      description:
        'Upload CSV/XLSX sales data, generate an AI-powered narrative summary, and deliver it via email.',
      contact: {
        name: 'RabbitAI Engineering',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local development',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
