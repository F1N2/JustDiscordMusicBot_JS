const Discord = require('discord.js');
const File = require('./File');

let message;

const Util = {
    init : function(msg) {
        message = msg;
        return true;
    },
    sendTextFile : function(text,name) {
        File.save('./Data/test.txt',text);
        let attachment = new Discord.MessageAttachment(File.read('./Data/test.txt'),name?name:'message.txt');
        File.remove('./Data/test.txt');
        return message.channel.send(attachment);
    },
    send : function(text) {
        if(text.length>=2000) return this.sendTextFile(text,'message.txt');
        else return message.channel.send(text);
    }
}

module.exports = Util;