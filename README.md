Diese APP benötigt folgende **Umgebungsvariablen**:

#### `CHECK_INTERVAL`
Die Zeit in Millisekunden für wie lange der cache gespeichert werden soll, bis erneut abgefragt wird.
Der Interval startet erst wenn die Abfrage fertig ist, das heisst ein wert von 0 bedeutet eine Endlosschleife von Abfragen, aber nicht mehrere Abfragen gleichzeitig.
Standardwert ist `300000` (5 Minuten).

#### `TS_ADDRESS`
Die IP-Adresse des Teamspeak Servers.
Standardwert ist `127.0.0.1`.

#### `TS_PORT`
Der ServerQuery-Port des Teamspeak Servers.
Standardwert ist `10011` (Der Standard ServerQuery-Port).

#### `TS_VS`
Die Virtuelle Server ID des Teamspeak Servers.
Standardwert ist `1`.

#### `USER_NAME` & `USER_PASS`
Der Benutzername und das Passwort des Server-Query Accounts. Kein Standartwert.

#### `PORT`
Der HTTP-Port über den man die APP erreichen soll. Kein Standartwert.

#### `DEBUG`
Siehe [debug](https://github.com/visionmedia/debug).
Standardwert ist `*` (Alles).
Gültige Werte sind: `webserver` & `teamspeak`.
