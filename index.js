// [JSLint](http://www.jslint.com/) Anweisungen.
/*jslint nomen: true, unparam: true*/

// **ECMAScript 5** strict Modus.
"use strict";

// Umgebungsvariable `DEBUG` auf alles (`*`) setzen. Die Umgebungsvariable wird vom Modul [debug](https://github.com/visionmedia/debug) genutzt.
process.env.DEBUG = "*";

// [Kofigurationsdatei](config.html), sowie alle benötigten abhängigkeiten laden.
var config = require('./config.json');
var TeamSpeakClient = require("node-teamspeak");
var http = require('http');
var CronJob = require('cron').CronJob;
var _ = require('underscore');
var debug = require('debug')("TS3-Query-Info");
var async = require('async');

// Globale Variable für das Speichern der Daten. 
// Damit wir nicht bei jeder Anfrage erneut den Teamspeak Server anfragen müssen, werden die Daten hier zwischengespeichert.
var REQUEST_CACHE = {};

// Selbiges gilt auch für die Channel. Da wir aber keine Informationen für einzelne Channel brauchen, sondern lediglich den Namen des Channels zur jeweiligen ID, speichern wir dies separat.
var CHANNEL_LIST = [];

// Die Variable für den TS Query Client. Wir erstellen die Variable zwar hier, weisen aber erst am ende des Skriptes die Daten zu. Hauptsächlich  damit JSLint nicht meckert.
var TeamspeakQueryClient = null;

// Funktion um Informationen über den Server anzufragen.
var requestServerinfo = function () {

    // Der Befehl `serverinfo` wird per TS Query Client gesendet.
    // `err` ist ein Objekt, welches uns mitteilt, ob die Anfrage erfolgreich war, und `response` ist sind die Daten als JSON Objekt.
    TeamspeakQueryClient.send("serverinfo", function (err, response) {

        // Debug Nachricht an die Konsole ausgeben, um auf mögliche Fehler hinzuweisen.
        debug("Requesting Serverinfo", err);

        // Die Daten des Servers werden an unsere globale Variable `REQUEST_CACHE` übergeben.
        REQUEST_CACHE.name              = response.virtualserver_name;
        REQUEST_CACHE.address           = config.ts.address;
        REQUEST_CACHE.port              = config.ts.port;
        REQUEST_CACHE.welcomemessage    = response.virtualserver_welcomemessage;
        REQUEST_CACHE.plattform         = response.virtualserver_platform;
        REQUEST_CACHE.version           = response.virtualserver_version;
        REQUEST_CACHE.channels          = response.virtualserver_channelsonline;
        REQUEST_CACHE.uptime            = response.virtualserver_uptime;
        REQUEST_CACHE.maxclients        = response.virtualserver_maxclients;
    });
};

// Asynchrone Funktion um Informationen über einen Client anzufragen.
// `client` ist ein Client Objekt, wie es von der `clientlist` zurück gegeben wird.
var requestClientInfo = function (client, callback) {

    // Der Befehl `clientinfo` wird per TS Query Client gesendet. Zusätzlich senden wir die Client ID (`clid`) mit.
    TeamspeakQueryClient.send("clientinfo", {
        clid: client.clid
    }, function (err, response) {

        // Debug Nachricht an die Konsole ausgeben, um auf mögliche Fehler hinzuweisen.
        // Zusätzlich geben wir den Namen des Clients an der abgefragt wurde. Das macht es einfacher, wenn ein Fehler auftritt.
        debug('Requesting client info (%s)', client.client_nickname, err);

        // Eine neue Variable wird erstellt, in der wir die Informationen über den Client die wir benötigen speichern.
        var newClient = {
            "name": response.client_nickname,
            // Das doppelte Ausrufezeichen macht aus der variable einen Boolean wert, entweder `true` oder `false`.
            "input_muted": !!response.client_input_muted,
            "output_muted": !!response.client_output_muted,
            // Der Teamspeak Server sagt uns nur, wie die ID des Channels ist, in dem sich der Client befindet. Da wir aber einen Namen benötigen, nutzen wir underscore
            // um durch die globale Variable `CHANNEL_LIST` zu gehen, und zu schauen, welcher Channel die passende ID hat, und geben anhand dessem den Namen zurück.
            "channel": _.find(CHANNEL_LIST, function (c) {
                return c.cid === response.cid;
            }).channel_name
        };

        //Wir rufen das Callback auf, und geben das Objekt mit das gerade erstellt wurde.
        callback(null, newClient);
    });
};

// Funktion um eine Liste aller verbunden Clients vom Teamspeak zu erhalten.
var requestClientlist = function () {

    // Der Befehl `clientlist` wird per TS Query Client gesendet.
    TeamspeakQueryClient.send("clientlist", function (err, response) {

        // Debug Nachricht an die Konsole ausgeben, um auf mögliche Fehler hinzuweisen.
        debug("Requesting Client list", err);

        // Sollten keine Nutzer auf dem Server sein, oder nur einer, wird kein Array, sondern ein Objekt zurück gegeben. Da wir aber ein Array benötigen, müssen wir eins machen.
        if (!_.isArray(response)) {
            response = [response];
        }

        // Die Liste enthält auch verbundene Server Query Verbindungen, so wie wir selbst oder Troopers Teamspeak Wächter. Da wir diese aber nicht brauchen, filtern wir sie raus.
        var onlineList = _.filter(response, function (client) {
            return client.client_type !== 1;
        });

        // Mithilfe  des [async](https://github.com/caolan/async) Moduls rufen wir für jeden gefunden Client die Funktion [requestClientInfo](#section-12) auf.
        async.map(onlineList, requestClientInfo, function (err, results) {

            // [requestClientInfo](#section-12) hat aus dem einfachen Objekt nun die Daten raus gefiltert die wir tatsächlich brauchen und diese zurück gegeben.
            // Nun übergeben wir diese Daten an unsere globale variable.
            REQUEST_CACHE.clients = results;
        });
    });
};

// Funktion um eine Liste aller erstellen Channel zu erhalten.
var requestChannellist = function () {

    // Der Befehl `channellist` wird per TS Query Client gesendet.
    TeamspeakQueryClient.send("channellist", function (err, response) {

        // Debug Nachricht an die Konsole ausgeben, um auf mögliche Fehler hinzuweisen.
        debug("Requesting Channel list", err);

        // Wir übergeben die Liste an unsere globale Variable `CHANNEL_LIST`.
        CHANNEL_LIST = response;
    });
};

// Funktion die durch unseren [Cronjob](#section-52) aufgerufen wird.
var updateCache = function () {

    // Wir speichern den aktuellen Zeitstempel in unserer globalen Variable.
    REQUEST_CACHE.lastUpdate = Math.round(Date.now() / 1e3);

    // und rufen dann unsere Informationen ab.
    requestServerinfo();

    // Da wir die Channel Informationen benötigen, wenn wir die Liste mit Clients erstellen, rufen wir diese zu erst ab.
    requestChannellist();
    requestClientlist();
};

// Funktion um uns als Query einzuloggen.
var login = function () {
    TeamspeakQueryClient.send("login", {

        // Wir nutzen die Daten die wir in der `config.json` Datei angegeben haben.
        client_login_name: config.user,
        client_login_password: config.pass
    }, function (err, response) {

        // Debug Nachricht an die Konsole ausgeben, um auf mögliche Fehler hinzuweisen.
        debug("Logging in: %j", err || response);

        // Wir teilen dem Server mit, welchen virutalServer wir wollen.
        TeamspeakQueryClient.send("use", {
            sid: config.ts.virtualServer
        }, function (err, response) {

            // Debug nachricht an die Konsole ausgeben, um auf mögliche Fehler hinzuweisen.
            debug("Selecting Virtual Server (%s)", config.ts.virtualServer, err);

            // Wir sind nun erfolgreich eingeloggt und können das erste Mal die Daten abrufen.
            updateCache();
        });
    });
};

// Wir weisen unserer globalen Variable den TeamspeakClient zu, und geben an, zu welcher Adresse wir verbinden wollen.
TeamspeakQueryClient = new TeamSpeakClient(config.ts.address);

// Damit wir die benötigten Daten abrufen können, loggen wir uns als Erstes ein.
login();

// Sollte der TeamspeakQueryClient einen Fehler werfen, loggen wir das Ganze um später mehr Informationen zu erhalten, wenn wir ihn beheben wollen.
TeamspeakQueryClient.on("error", function (err) {
    debug("TeamspeakQueryClient error", err);
});

// Sollte der TeamspeakQueryClient getrennt werden, wird das hier aufgezeichnet.
TeamspeakQueryClient.on("close", function (queue) {
    debug("TeamspeakQueryClient closesed", queue);
});

// Wir erstellen unseren HTTP Server, um auf Anfragen reagieren zu können.
http.createServer(function (req, res) {

    // Die IP-Adresse, von der die Anfrage stammt. Diese wird nur in die Konsole geloggt und nicht gespeichert.
    // Dies dient hauptsächlich dazu, um einzelne Anfragen voneinander unterscheiden zu können.
    var ipAddress = req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress ||
                    req.socket.remoteAddress ||
                    req.connection.socket.remoteAddress;

    // Wir legen den Header fest.
    // Statuscode 200 sagt das alles Ok ist.
    res.writeHead(200, {

        // Wir setzen den Content-Type zu `application/json`.
        'Content-Type': 'application/json',

        // Und setzen ACAO auf alles (`*`) damit wir keine Probleme bezüglich Cross Origin Request Policy bekommen. 
        'Access-Control-Allow-Origin': '*'
    });

    // Wir senden unsere Informationen zurück, und enden damit die Anfrage.
    res.end(JSON.stringify(REQUEST_CACHE));

    // Debug Nachricht an die Konsole ausgeben, damit wir nachvollziehen können, dass eine Anfrage rein kam und wir diese bedient haben.
    debug("Serving reqeust from %s", ipAddress);

// Der Server wurde erstellt, und wird nun auf dem in der `config.json` Datei angegebenen Port hören.
}).listen(config.webport);

// Wir starten unseren CronJob.
// Damit aktualisieren wir alle `X` Sekunden unsere Informationen vom Teamspeak Server.
// Der Tatsächliche Intervall wird in der `config.json` Datei festgelegt.
var cJ = new CronJob(config.croninterval, updateCache, null, true);