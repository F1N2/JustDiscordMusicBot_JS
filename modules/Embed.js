const Discord = require('discord.js');
const fs = require('fs');

let message;

const Embed = {
    init : function(msg) {
        message = msg;
        return true;
    },
    title_desc : function(tag) {
        if(tag.color && tag.title && tag.desc) {
            let embed = new Discord.MessageEmbed()
                .setColor(tag.color)
                .setTitle(tag.title)
                .setDescription(tag.desc)
                .setTimestamp()
                .setFooter(message.author.username,message.author.avatarURL())
                .setThumbnail(tag.thumbnail)
                .setImage(tag.image);
            return embed;
        } else {
            return false;
        }
    },
    fields : function(tag) {
        if(tag.color && tag.fields) {
            let embed = new Discord.MessageEmbed()
                .setColor(tag.color)
                .setTitle(tag.title)
                .setTimestamp()
                .setFooter(message.author.username,message.author.avatarURL())
                .setThumbnail(tag.thumbnail)
                .setImage(tag.image);
            for(let i=0;i<tag.fields.length;i++) {
                embed.addField(tag.fields[i].name,tag.fields[i].value,tag.fields[i].inline);
            }
            return embed;
        } else {
            return false;
        }
    }
}

module.exports = Embed;