"use strict";

if (!process.env.DEBUG) {
    process.env.DEBUG = "*";
}

if (!process.env.CACHE_LIFETIME) {
    throw new Error("Umgebungsvariable CACHE_LIFETIME wird benötigt.");
}

if (!process.env.TS_ADDRESS) {
    throw new Error("Umgebungsvariable TS_ADDRESS wird benötigt.");
}

if (!process.env.TS_PORT) {
    throw new Error("Umgebungsvariable TS_PORT wird benötigt.");
}

if (!process.env.TS_VS) {
    throw new Error("Umgebungsvariable TS_VS wird benötigt.");
}

if (!process.env.PORT) {
    throw new Error("Umgebungsvariable PORT wird benötigt.");
}

if (!process.env.USER_NAME) {
    throw new Error("Umgebungsvariable USER_NAME wird benötigt.");
}

if (!process.env.USER_PASS) {
    throw new Error("Umgebungsvariable USER_PASS wird benötigt.");
}

require(require("path").join(__dirname, "server.js"));
