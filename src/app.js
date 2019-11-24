'use strict';
const { promisify } = require('util');
const _ = require('lodash');
const express = require('express');
const Swagger = require('swagger-express-mw');
const SwaggerUi = require('swagger-tools/middleware/swagger-ui');

// const config = require('./config');
const config = { webApiServiceUrl: 'localhost:8001' };
const app = express();

const logger = require('./logger');
const ValidationError = require('./domain/validation');

const handleError = (err, req, res, next) => {
    const availableLogger = req.logger || logger;
    if ((err instanceof ValidationError || err.statusCode === 400) &&
        !_.isEmpty(err.errors)
    ) {
        availableLogger.warning(`Input Validation Error: ${JSON.stringify(err.errors)}`);
        res.status(400).json({ success: false, message: err.errors });
    } else {
        const is404 = err.statusCode === 404;
        if (!is404) {
            availableLogger.error(err);
        }
        res.status(err.statusCode || 500).json({
            success: false,
            message: is404 ? 'Not Found' : 'Internal Server Error'
        });
    }
    next();
};

const initSwagger = async (webApiServiceUrl) => {
    const swaggerCreate = promisify(Swagger.create);
    return await swaggerCreate({
        appRoot: __dirname,
        swaggerFile: `${__dirname}/swagger.yaml`,
        webApiBaseUrl: webApiServiceUrl,
        swaggerSecurityHandlers: {
            BasicAuth: () => { }
        }
    });
}
async function init() {
    app.enable('trust proxy');
    app.disable('x-powered-by');
    // await config.init();
    const swaggerExpress = await initSwagger(config.webApiServiceUrl);

    swaggerExpress.register(app);
    const {
        ui: uiPath,
        raw: rawPath
    } = swaggerExpress.runner.config.swagger.docEndpoints
    const { basePath } = swaggerExpress.runner.swagger;

    //setup swagger ui
    app.use(SwaggerUi({
        ...swaggerExpress.runner.swagger,
        securityDefinitions: null
    }, {
        swaggerUi: uiPath || 'doc', //swagger ui web page
        apiDocs: rawPath || 'swagger', //api document in json format
        swaggerUiDir: `${__dirname}/../static`
        // swaggerUiDir: pathToSwaggerUi 
    }));

    app.set('productPath', basePath);

    app.get(`${basePath}/`, (req, res) => res.redirect(uiPath));
    app.get('/', (req, res) => res.redirect(uiPath));

    // this needs to registered at the end
    app.use(handleError);
    return app;
}

module.exports = {
    init
}