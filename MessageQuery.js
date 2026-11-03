import Database from 'better-sqlite3';
import { Client } from 'discord.js';

/**
 * Crear una instancia de los mensajes en la base de datos para poder administrarlos.
 */
class MessageQuery {

    //Base de datos a la que pertenece el mensaje.
    /**@type {Database} */
    #DATABASE;

    /**@type {Client} */
    #AppClient

    #id;
    #guild_id;
    #channel_id;
    #message_id;
    #custom_id;

    /**
     * 
     * @param {messageFromDataBase} messageDB 
     * @param {Database} db 
     */
    constructor(messageDB, db, appClient){

        this.#DATABASE = db;

        this.#AppClient = appClient;

        this.#id = messageDB.id;
        this.#guild_id = messageDB.guild_id;
        this.#channel_id = messageDB.channel_id;
        this.#message_id = messageDB.message_id;
        this.#custom_id = messageDB.custom_id;
        
    }

    #formatTimeISO8601SQL(time){
        const year = time.year.toString().padStart(4, '0');;
        const month = time.month.toString().padStart(2, '0');
        const day = time.day.toString().padStart(2, '0');
        const hour = time.hour.toString().padStart(2, '0');
        const minute = time.minute.toString().padStart(2, '0');
        const second = time.second.toString().padStart(2, '0');
        const millisecond = time.millisecond.toString().padStart(3, '0');
        return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millisecond}`;
    }

    /**
     * Retorna el identificador unico de el mensaje en la base de datos.
     * @returns {number} 
     */
    getID(){
        return this.#id;
    }

    /**
     * Retorna el identificador de el servidor en donde se encuentra el mensaje.
     * @returns {string}
     */
    getGuildID(){
        return this.#guild_id;
    }

    /**
     * Retorna el identificador de el canal en donde se encuentra el mensaje.
     * @returns {string}
     */
    getChannelID(){
        return this.#channel_id;
    }

    /**
     * Retorna el identificador unico de el mensaje en discord.
     * @returns {string}
     */
    getMessageID(){
        return this.#message_id;
    }

    /**
     * Retorna el identificador que relaciona a uno o mas mensajes.
     * @returns {string}
     */
    getCustomID(){
        return this.#custom_id;
    }

    /**
     * Retorna los valores guardados en la base de datos relacionados al mensaje.
     * @returns {object}
     */
    getData(){
        try{
            return JSON.parse(this.#DATABASE.prepare(`
                    SELECT data
                    FROM messages
                    WHERE id = ?;
                `).get([this.#id]).data);
        } catch {
            throw Error('Error: No se pudo obtener los datos correctamente.');
        }
    }

    /**
     * Obtener fecha de eliminacion automatica.
     * @returns {Temporal.PlainDateTime}
     */
    getDeleteDate(){
        
        try {
            return Temporal.PlainDateTime.from(this.#DATABASE.prepare(`
                    SELECT delete_date
                    FROM messages
                    WHERE id = ?;
                `).get([this.#id]).delete_date);
        } catch {
            throw Error('Error: No se pudo obtener los datos correctamente.');
        }

    }

    /**
     * Declarar nuevos datos en la base de datos.
     * @param {Object|null} callback 
     */
    setData(newData){
        if(typeof newData != 'object')
            throw Error('Error: No se recibio un objeto o "null".');

        try{
            this.#DATABASE.prepare('UPDATE messages SET data = ? WHERE id = ?').run([
                newData ? JSON.stringify(newData) : null,
                this.#id
            ]);
        } catch {
            throw Error('Error: No se pudo declarar los nuevos datos en la base de datos.')
        }
    }

    /**
     * Declarar nuevo tiempo de eliminacion programada.
     * @param {Temporal.PlainDateTime} date 
     */
    setDeleteDate(date){
        try{
            this.#DATABASE.prepare(`
                UPDATE messages SET delete_date = ? WHERE id = ?;
            `).run([
                this.#formatTimeISO8601SQL(date),
                this.#id
            ]);
        } catch(e) {
            throw Error(`Error: No se pudo establecer la nueva fecha de elimiación:\n${e}`);
        }
    }

    /**
     * Hacer un fetch de el mensaje en discord.
     * @returns {Promise<import('discord.js').Message|null>}
     */
    async fetchMessage(){
        if(!this.#AppClient){
            (async ()=>
                console.error('Error warn: El cliente de la aplicacion no fue declarado antes de consultar la base de datos.')
            )();
            return null;
        }

        let fetchRequest = await this.#AppClient.channels.fetch(this.#channel_id);

        if(fetchRequest)
            fetchRequest = await fetchRequest.messages.fetch(this.#message_id);

        return fetchRequest;
    }

    /**
     * Eliminar el mensaje de la base de datos, tambien puede elminar el mensaje de discord.
     * @param {boolean} delFromDiscord Con 'true' el metodo eliminara tambien el mensaje en discord.
     */
    async delete(delFromDiscord){
        if(typeof delFromDiscord != Boolean)
            throw Error('Error: No se obtuvo un boleano como parametro.');

        this.#DATABASE.prepare(`DELETE FROM messages WHERE id = ?;`).run([this.#id]);

        await this.fetchMessage()?.delete();
    }

}

export {MessageQuery}