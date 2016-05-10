import {toString, toNumber} from "lodash";

class Env {
    constructor(name) {
        this.name = name;
        this.value = process.env[this.name];
        return this;
    }
    required() {
        if (!this.value) {
            throw new Error(`Umgebungsvariable "${this.name}" fehlt!`);
        }
        return this;
    }
    optional(defaultValue) {
        if (!this.value) {
            this.value = defaultValue;
        }
        return this;
    }
    array(delim) {
        return toString(this.value).split(delim || ",");
    }
    string() {
        return toString(this.value);
    }
    number() {
        return toNumber(this.value);
    }
}
export const getEnv = (name) => new Env(name);
