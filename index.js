const swaggerUi = require('swagger-ui-express');
const merge = require('merge');

const defaultOptions = require('./config/default');
const swaggerEventsOptions = require('./config/swaggerEvents');
const processSwagger = require('./processSwagger');
const swaggerEvents = require('./swaggerEvents');

const expressJSDocSwagger = app => (userOptions = {}, userSwagger = {}) => {
  const events = swaggerEvents(swaggerEventsOptions(userOptions));
  const { instance } = events;
  const options = {
    ...defaultOptions,
    ...userOptions,
  };
  let swaggerObject;

  const initSwaggerObject = () => (
    new Promise((resolve, reject) => {
      if (swaggerObject) {
        resolve(swaggerObject);
      } else {
        processSwagger(options, events.processFile)
          .then(result => {
            swaggerObject = {
              ...swaggerObject,
              ...result.swaggerObject,
            };
            swaggerObject = merge.recursive(true, swaggerObject, userSwagger);
            events.finish(swaggerObject, {
              jsdocInfo: result.jsdocInfo,
              getPaths: result.getPaths,
              getComponents: result.getComponents,
              getTags: result.getTags,
            });
            resolve(swaggerObject);
          })
          .catch(err => {
            events.error(err);
            reject(err);
          });
      }
    })
  );
  initSwaggerObject();

  if (options.exposeSwaggerUI) {
    app.use(options.swaggerUIPath, (req, res, next) => {
      initSwaggerObject().then(spec => {
        req.swaggerDoc = {
          ...spec,
          host: req.get('host'),
        };
        next();
      }).catch(next);
    }, swaggerUi.serve, swaggerUi.setup(undefined, options.swaggerUiOptions));
  }

  if (options.exposeApiDocs) {
    app.get(options.apiDocsPath, (req, res, next) => {
      initSwaggerObject().then(spec => {
        res.json({
          ...spec,
          // we skipped this as is not a valid prop in OpenAPI
          // This is only being used in the SwaggerUI Library
          host: undefined,
        });
      }).catch(next);
    });
  }

  return instance;
};

module.exports = expressJSDocSwagger;
