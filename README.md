## Teamspeak-Info
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

## License
The MIT License (MIT)

Copyright (c) 2016 Martin Rump

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
