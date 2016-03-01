if (!process.env.DEBUG) {
    process.env.DEBUG = "*";
}

if (!process.env.CHECK_INTERVAL) {
    process.env.CHECK_INTERVAL = 300000;
}
process.env.CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL, 10);


if (!process.env.TS_ADDRESS) {
    process.env.TS_ADDRESS = "127.0.0.1";
}


if (!process.env.TS_PORT) {
    process.env.TS_PORT = 10011;
}
process.env.TS_PORT = parseInt(process.env.TS_PORT, 10);


if (!process.env.TS_VS) {
    process.env.TS_VS = 1;
}
process.env.TS_VS = parseInt(process.env.TS_VS, 10);


if (!process.env.USER_NAME) {
    throw new Error("Umgebungsvariable USER_NAME wird benötigt.");
}


if (!process.env.USER_PASS) {
    throw new Error("Umgebungsvariable USER_PASS wird benötigt.");
}


if (!process.env.PORT) {
    throw new Error("Umgebungsvariable PORT wird benötigt.");
}
process.env.PORT = parseInt(process.env.PORT, 10);


import "./webserver.js";
