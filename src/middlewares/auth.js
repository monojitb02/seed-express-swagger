const securityHandler = (req, res, next) => {
    if (!req.headers.authorization) {
        res.status(401).send();
        return;
    }
    next();
}
module.exports = securityHandler;