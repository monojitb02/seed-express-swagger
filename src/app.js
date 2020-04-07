'use strict';
const { promisify } = require('util');
const express = require('express');
const Swagger = require('swagger-express-mw');
const SwaggerUi = require('swagger-tools/middleware/swagger-ui');
const authMiddleware = require('./middlewares/auth');
const errorHandler = require('./middlewares/auth');

// const config = require('./config');
const app = express();

class Application {
    async initSwagger() {
        const swaggerCreate = promisify(Swagger.create);
        return await swaggerCreate({
            appRoot: __dirname,
            swaggerFile: `${__dirname}/swagger.yaml`,
            swaggerSecurityHandlers: {
                basicAuth: authMiddleware,
                APIKeyHeader: authMiddleware,
                APIKeyQueryParam: authMiddleware,
            }
        });
    }
    async init() {
        // await config.init();
        app.enable('trust proxy');
        app.disable('x-powered-by');
        const swaggerExpress = await this.initSwagger();

        swaggerExpress.register(app);
        const {
            ui: uiPath,
            raw: rawPath
        } = swaggerExpress.runner.config.swagger.docEndpoints
        const { basePath } = swaggerExpress.runner.swagger;

        //setup swagger ui
        app.use(SwaggerUi({
            ...swaggerExpress.runner.swagger,
            // securityDefinitions: null
        }, {
            swaggerUi: uiPath, //swagger ui web page
            apiDocs: rawPath, //api document in json format
            swaggerUiDir: `${__dirname}/../static`
        }));

        app.set('productPath', basePath);

        app.get(`${basePath}/`, (req, res) => res.redirect(uiPath));
        app.get('/', (req, res) => res.redirect(uiPath));

        // this needs to registered at the end
        app.use(errorHandler);
        return app;
    }
}

module.exports = new Application();