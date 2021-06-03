//
// Just Discord Music Bot
// Made By Green050121
//
// require Module
//
// discord.js
// request
// request-promise
// ytdl-core
// dotenv
// opusscript
// fs
// 
// Windows : npm install ffmpeg-static
// Linux : sudo apt-get install ffmpeg
//

const Discord = require('discord.js');
const client = new Discord.Client();

//Read token from .env file
require('dotenv').config();

const Embed = require('./modules/Embed');
const Music = require('./modules/Music');
const File = require('./modules/File');

let setting = JSON.parse(File.read('./Data/setting.json'));
let lang = JSON.parse(File.read('./Data/lang.json'));
lang = lang.list.indexOf(setting.lang)!=-1?lang[setting.lang]:lang.en;

let prefix = setting.prefix;

String.prototype.format = String.prototype.f = function() {
    var s = this,i = arguments.length;
    while (i--) s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    return s;
};

let messageReaction = {};

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    let count=0;
    let Activity = setInterval(()=>{
        let str = [`Commands : ${prefix}?`,`Just Discord Music Bot`];
        client.user.setActivity(str[count]);
        if(count<str.length-1) count++;
        else count=0;
    },10000);
});

client.on("messageReactionAdd", function(reaction, user){
    if(!user.bot)messageReaction[reaction.message.id]!=null? messageReaction[reaction.message.id].onClick(reaction, user, messageReaction[reaction.message.id].message):null;
});

client.on("messageReactionRemove", function(reaction, user){
    if(!user.bot)messageReaction[reaction.message.id]!=null? messageReaction[reaction.message.id].onClick(reaction, user, messageReaction[reaction.message.id].message):null;
});
client.on('message', async (message) => {

    if(message.author.bot) return;

    Embed.init(message);//Embed Module need message data
    Music.init(message,messageReaction);//Music Module need message,messageReaction data

    messageReaction.send = function(str, arr, callback) {
        try {
            if(typeof callback != "function") return "It is not a function.";
            if(!Array.isArray(arr)) return "It is not an array.";
            message.channel.send(str).then((message)=>{
                arr.forEach((val)=>{
                    message.react(val).catch((e)=>{});
                })
                if(callback!=null) {
                    messageReaction[message.id]==null? messageReaction[message.id] = {}:null;
                    messageReaction[message.id].message = message;
                    messageReaction[message.id].onClick = callback;
                }
            }).catch((e)=>{});
        } catch (e){}
    }//Made By Cool7

    if(message.content.indexOf(prefix)==0) {

        let msg = message.content.replace(prefix,'');

        if(message.channel.type!='dm') {

            if(msg=='help' || msg=='?') message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.help.dafault.title,
                'desc':lang.help.dafault.desc.join('\n').format(prefix)
            }));
    
            if(msg.indexOf('play ')==0 || msg.indexOf('p ')==0) Music.play(msg.replace(/play /g,'').replace(/p /g,''));
            if(msg.indexOf('remove ')==0 || msg.indexOf('r ')==0) Music.remove(msg.replace(/remove /g,'').replace(/r /g,''));
            if(msg.indexOf('skip ')==0 || msg.indexOf('sk ')==0) Music.skip(msg.replace(/skip /g,'').replace(/sk /g,''));
            if(msg.indexOf('queue')==0 || msg.indexOf('list')==0) Music.list(10,msg.replace(/queue /g,'').replace(/list /g,''));
            if(msg.indexOf('np')==0) Music.nowPlay(msg.substr(3).toLowerCase()=="object"?true:false);
            if(msg=='repeat' || msg=='rep' || msg=='loop') Music.repeat();
            if(msg=='resume' || msg=='res') Music.resume();
            if(msg=='pause' || msg=='pa') Music.pause();
            if(msg=='skip' || msg=='sk') Music.skip();
            if(msg=='stop' || msg=='st') Music.stop();

            //Music Custom List
            if(msg=='cl') Music.customList.help();

            if(msg.indexOf('cl l')==0 || msg.indexOf('cl list')==0) Music.customList.list(10,msg.substr(3).replace(/list /g,'').replace(/l /g,'').toLowerCase()=="file"?true:false);
            if(msg.indexOf('cl r')==0 || msg.indexOf('cl remove')==0) Music.customList.remove(msg.substr(3).replace(/remove /g,'').replace(/r /g,''));
            if(msg.indexOf('cl a')==0 || msg.indexOf('cl add')==0) Music.customList.add(msg.substr(3).replace(/add /g,'').replace(/a /g,''));
            if(msg=='cl c' || msg=='cl clear') Music.customList.clear();
            if(msg=='cl p' || msg=='cl play') Music.customList.play();
    
        }

    }

});

client.login(process.env.TOKEN||process.argv[2]);