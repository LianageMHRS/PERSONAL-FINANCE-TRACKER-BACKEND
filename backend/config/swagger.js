const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Personal Finance Tracker API",
            version: "1.0.0",
            description: "API documentation for user authentication and management",
        },
        servers: [
            {
                url: "http://localhost:5000", // Default URL
            },
        ],
    },
    apis: ["./routes/*.js"], // Only documents API routes, not controllers
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerDocs = (app) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log(`📄 Swagger API documentation available at: http://localhost:5000/api-docs`);
};

module.exports = swaggerDocs;
