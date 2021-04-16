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
// opusscript
// fs
// 
// Windows : npm install ffmpeg-static
// Linux : sudo apt-get install ffmpeg
//

const Discord = require('discord.js');
const client = new Discord.Client();
const request = require('request-promise');
const ytdl = require('ytdl-core');
const fs = require('fs');

const Embed = require('./modules/Embed');
const Music = require('./modules/Music');

let setting = JSON.parse(fs.readFileSync('./Data/setting.json'));
let lang = JSON.parse(fs.readFileSync('./Data/lang.json'));
lang = lang.list.indexOf(setting.lang)!=-1?lang[setting.lang]:lang.en;

let prefix = setting.prefix;

const File = {
    read:function(a,b) {
        try {
            return fs.readFileSync(a,b);
        } catch(e) {
            return null;
        }
    },
    save:function(a,c,d) {
        let b = a.split('/').pop();
        a = a.replace('/'+b,'');
        if(!fs.existsSync(a)) fs.mkdirSync(a);
        fs.writeFileSync(a+'/'+b,c,d);
        return true;
    },
    remove:function(a) {
        fs.unlinkSync(a);
        return true;
    }
}

String.prototype.format = String.prototype.f = function() {
    var s = this,i = arguments.length;
    while (i--) s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    return s;
};

let messageReaction = {};

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    let count=0;
    client.user.setActivity(`Commands : ${prefix}?`);
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
            if(msg.indexOf('skip ')==0 || msg.indexOf('sk ')==0) Music.skip(msg.replace(/skip /g,'').replace(/sk /g,''));
            if(msg=='repeat' || msg=='rep') Music.repeat();
            if(msg=='resume' || msg=='res') Music.resume();
            if(msg=='pause' || msg=='pa') Music.pause();
            if(msg=='skip' || msg=='sk') Music.skip();
            if(msg=='stop' || msg=='st') Music.stop();
            if(msg=='np') Music.nowPlay();
            if(msg=='list') Music.list(10);
    
        }

    }

});

client.login(process.env.TOKEN||process.argv[2]);