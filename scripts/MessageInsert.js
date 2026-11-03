
class MessageInsert {

    #guild_id;
    #channel_id;
    #message_id;
    #custom_id;
    #data = null;
    #delete_date = null;

    /**
     * @param {import('discord.js').Message} discordMessage 
     */
    constructor(discordMessage){
        this.#guild_id = discordMessage.guild.id;
        this.#channel_id = discordMessage.channel.id;
        this.#message_id = discordMessage.id;
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

    getGuildID(){
        return this.#guild_id;
    }

    getChannelID(){
        return this.#channel_id;
    }

    getMessageID(){
        return this.#message_id;
    }

    getCustomID(){
        return this.#custom_id;
    }

    getData(){
        return this.#data;
    }

    getDeleteDate(){
        return this.#delete_date;
    }

    setCustomID(customId){
        if(typeof customId != 'string')
            throw Error('Error: El parametro no es una cadena de texto.');
        this.#custom_id = customId;
    }

    setData(object){
        if(object !== null && typeof object != 'object')
            throw Error('Error: El parametro no es valido.');
        this.#data = object ? {...object} : null;
    }

    setDeleteDate(date){
        let dateToString;
        try{
            if(date !== null)
                dateToString = this.#formatTimeISO8601SQL(date);
            else
                dateToString = null;
        } catch {
            throw Error('Error: No se pudo declarar el tiempo de eliminacion programada.');
        }
        this.#delete_date = dateToString;
    }
}

export {MessageInsert}