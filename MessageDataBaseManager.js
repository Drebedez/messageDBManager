import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { Client, Message } from 'discord.js';

import { MessageInsert } from './MessageInsert.js';
import { MessageQuery } from './MessageQuery.js';

/**
 * El objeto y sus metodos estan echos para trabajar con una estructura de bases de datos en concreto.
 * La manipulacion externa de esa base de datos de manera incorrecta puede causar fallos en el uso de
 * esta libreria.
 */
class MessageDataBaseManager {
    
    /**
     * @typedef {Object} messagesIDs
     * @property {number} id ID de el mensaje en la base de datos.
     * @property {string} guildId ID de servidor.
     * @property {string} channelId ID de canal.
     * @property {string} messageId ID de mensaje.
     * @property {string} customId ID perzonalizado que permite identificar uno o mas mensajes de un tipo.
     */

    //Instancia de la base de datos.
    #DATABASE;

    //Cliente instanciado de la aplicacion.
    #AppClient;

    constructor(dir){

        try{
            new Database(dir, {readonly: true});
        } catch(e) {
            throw Error(`Error en la verificacion de la ruta de la base de datos:\n${e}`);
        }

        this.#DATABASE = new Database(dir);

    }

    /**
     * Usar el metodo close de better-sql para cerrar la base de datos.
     */
    close(){
        this.#DATABASE.close();
    }

    /**
     * Armar base de datos con la cual trabaja la libreria.
     * @param {string} dir Ruta en donde se alojara la nueva base de datos.
     * @param {string} fileName Nombre de la nueva base de datos.
     */
    static createDefaultDB(dir, fileName = 'def_message.db') {

        try{
            if(!fs.statSync(dir).isDirectory())
                throw Error('Error: No se obtuvo una ruta de carpeta.');
        } catch (e) {
            throw Error(`Error: No se pudo obtener la ruta de archivos:\n${e}`);
        }

        if(typeof fileName != 'string')
            throw Error('Error: El nombre de el archivo no es una cadena de texto.');
        if (path.extname(fileName) != '.db')
            throw Error('Error: El nombre de el archivo no posee la extension "db".');

        const newDirFile = path.join(dir, fileName);

        fs.writeFileSync(newDirFile, '');

        new Database(newDirFile).exec(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT,
                    channel_id TEXT,
                    message_id TEXT,
                    custom_id TEXT,
                    data TEXT,
                    delete_date TEXT
                );

                CREATE TRIGGER IF NOT EXISTS auto_delete_msg_on_insert
                AFTER INSERT ON messages
                BEGIN
                    DELETE FROM messages 
                    WHERE delete_date <= strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime');
                END;

                CREATE TRIGGER IF NOT EXISTS auto_delete_msg_on_update
                AFTER UPDATE ON messages
                BEGIN
                    DELETE FROM messages 
                    WHERE delete_date <= strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime');
                END;
            `);

    }

    /**
     * Establecer el cliente instanciado de la aplicacion de discord para habilitar funciones.
     * @param {Client} Client 
     * @returns {messageDBManager};
     */
    setAppClient(appClient){
        if(!(appClient instanceof Client))
            throw Error('Error: No se entrego una instancia de cliente de discord.');

        this.#AppClient = appClient;

        return this;
    }

    /**
     * Obten todos los mensajes de la base de datos de 
     * @param {messagesIDs} messagesIDs 
     * @returns {messageData[]}
     */
    get(messagesIDs){

        messagesIDs ??= {};

        if(messagesIDs === null || typeof messagesIDs != 'object')
            throw Error('Error: No se recibio un objeto.');

        if(messagesIDs.id !== undefined && typeof messagesIDs.id != 'number')
            throw Error('Error: No se recibio un tipo de valor valido.');
        if(messagesIDs.guildId !== undefined && typeof messagesIDs.guildId != 'string')
            throw Error('Error: No se recibio un tipo de valor valido.');
        if(messagesIDs.channelId !== undefined && typeof messagesIDs.channelId != 'string')
            throw Error('Error: No se recibio un tipo de valor valido.');
        if(messagesIDs.messageId !== undefined && typeof messagesIDs.messageId != 'string')
            throw Error('Error: No se recibio un tipo de valor valido.');
        if(messagesIDs.customId !== undefined && typeof messagesIDs.customId != 'string')
            throw Error('Error: No se recibio un tipo de valor valido.');

        let query;
        try {
            query = this.#DATABASE.prepare(`
                SELECT id, guild_id, channel_id, message_id, custom_id
                FROM messages
                WHERE
                (? IS NULL OR id = ?)
                AND (? IS NULL OR guild_id = ?)
                AND (? IS NULL OR channel_id = ?)
                AND (? IS NULL OR message_id = ?)
                AND (? IS NULL OR custom_id = ?);
                `).all([
                    messagesIDs.id,
                    messagesIDs.id,
                    messagesIDs.guildId,
                    messagesIDs.guildId,
                    messagesIDs.channelId,
                    messagesIDs.channelId,
                    messagesIDs.messageId,
                    messagesIDs.messageId,
                    messagesIDs.customId,
                    messagesIDs.customId
                ])?.map(x=> new messageQuery(x, this.#DATABASE, this.#AppClient));
        } catch (e) {
            throw Error(`Error: No se pudo consultar correctamente la base de datos.\n${e}`);
        }
    
        return query ?? null;
    }

    /**
     * Registrar un mensaje de discord en la base de datos.
     * @param {import('discord.js').Message} discordMessage 
     * @param {(messageConstruct)=>messageConstruct} dataFill  
     */
    add(discordMessage, dataFill){
        
        if(!(discordMessage instanceof Message))
            throw Error('Error: No se recibio una instancia de "Message".');

        if(typeof dataFill != 'function')
            throw Error('Error: No se recibio un callback.');

        let getInput = dataFill(new messageInsert(discordMessage));

        if(!(getInput instanceof messageConstruct))
            throw Error('Error: No se recibio una instancia de "messageConstruct".');

        if(!getInput.getCustomID())
            throw Error('Error: No se declaro un customId.');

        this.#DATABASE.prepare(`
                INSERT INTO messages (guild_id, channel_id, message_id, custom_id, data, delete_date)
                VALUES (?, ?, ?, ?, ?, ?);
            `).run([
                getInput.getGuildID(),
                getInput.getChannelID(),
                getInput.getMessageID(),
                getInput.getCustomID(),
                getInput.getData(),
                getInput.getDeleteDate()
            ])
    }

}

export {MessageDataBaseManager}
