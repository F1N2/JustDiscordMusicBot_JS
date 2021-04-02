const request = require('request-promise');
const ytdl = require('ytdl-core');
const fs = require('fs');
const Embed = require('./Embed');

const setting = JSON.parse(fs.readFileSync('./Data/setting.json'));
const lang = JSON.parse(fs.readFileSync('./Data/lang.json'))[setting.lang];

let message,messageReaction={},servers={};

/*

Require this source in index.js

let messageReaction = {};

lient.on("messageReactionAdd", function(reaction, user){
    if(!user.bot)messageReaction[reaction.message.id]!=null? messageReaction[reaction.message.id].onClick(reaction, user, messageReaction[reaction.message.id].message):null;
});

client.on("messageReactionRemove", function(reaction, user){
    if(!user.bot)messageReaction[reaction.message.id]!=null? messageReaction[reaction.message.id].onClick(reaction, user, messageReaction[reaction.message.id].message):null;
});

*/

String.prototype.format = String.prototype.f = function() {
    var s = this,i = arguments.length;
    while (i--) s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    return s;
};

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
}

function shuffle(a) {
    var j,x,i;
    for (i=a.length;i;i-= 1) {
        j=Math.floor(Math.random()*i);
        x=a[i-1];
        a[i-1]=a[j];
        a[j]=x;
    }
}

function toTime(sec) {
    let sec_num = Number(sec);
    let hours = sec_num/3600|0;
    let minutes = sec_num/60%60|0;
    let seconds = sec_num%60;
    minutes = minutes<9 &&hours!=0? '0'+minutes : minutes;
    seconds = seconds<9?"0"+seconds:seconds;
    return hours==0?minutes+":"+seconds:hours+":"+minutes+":"+seconds
}

const Music = {
    init : function(msg,msgReaction) {
        message = msg;
        messageReaction = msgReaction;
        if(!servers[message.guild.id]) servers[message.guild.id]={queue:[],repeat:false,pause:false};
        return true;
    },
    nowPlay : function() {
        let server = servers[message.guild.id]
        if(server.queue.length>0) {
            message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.music.np.np,
                'thumbnail':server.queue[0].image,
                'desc':[
                    '➯ '+lang.music.np.title+' : '+server.queue[0].title,
                    '➯ '+lang.music.np.owner+' : '+server.queue[0].owner,
                    '➯ '+lang.music.np.length+' : `'+toTime(server.dispatcher.streamTime/1000|0)+'` / `'+server.queue[0].length+'`',
                    '➯ '+lang.music.np.status+' : '+(!server.repeat?!server.pause?'▶️':'⏸':'🔄')
                ].join('\n')
            }));
        } else message.channel.send(lang.music.no_song_play);
    },
    ytdl : function(connection) {
        let server = servers[message.guild.id];
        server.dispatcher = connection.play(ytdl(server.queue[0].url,{quality:'highestaudio',highWaterMark:1<<25}));
        server.dispatcher.on('finish',()=>{
            if(server.repeat==true) server.queue.push(server.queue[0]);
            server.queue.shift();
            if(server.queue.length>0) this.ytdl(connection);
            else connection.disconnect();
        });
    },
    play : async function(keyword) {
        let server = servers[message.guild.id];
        let vc = message.member.voice.channel;
        if(!vc) { message.channel.send(lang.music.play.voice); return; }
        let p = vc.permissionsFor(message.client.user);
        if(!p.has('CONNECT')) message.channel.send(lang.music.play.connect);
        else if(!p.has('SPEAK')) message.channel.send(lang.music.play.speak);
        else try {
            if(keyword.indexOf('https://')==0 && (keyword.indexOf('playlist?')!=-1 || keyword.indexOf('&list')!=-1) ) {//Playlist
                keyword = keyword.indexOf('playlist?')!=-1?keyword.split('?list=')[1]:keyword.split('&list=')[1];//Get Playlist Id
                let data = await request('https://www.youtube.com/playlist?list='+keyword);
                data = String(data).split('var ytInitialData = ')[1].split(';')[0];
                data = JSON.parse(data).contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
                for(let i=0;i<data.length;i++) server.queue.push({
                    'title':data[i].playlistVideoRenderer.title.runs[0].text,
                    'owner':data[i].playlistVideoRenderer.shortBylineText.runs[0].text,
                    'length':data[i].playlistVideoRenderer.lengthText.simpleText,
                    'url':'https://www.youtube.com/watch?v='+data[i].playlistVideoRenderer.videoId,
                    'image':data[i].playlistVideoRenderer.thumbnail.thumbnails[0].url
                });
                if(server.queue.length==data.length) vc.join().then((c)=>this.ytdl(c));
                message.channel.send(this.playEmbed(data.length));
            } else if(keyword.indexOf('https://')==0) {//Video Link
                keyword = keyword.indexOf('youtu.be')!=-1?keyword.split('/')[3]:keyword.split('?v=')[1];//Get Video Id
                let data = await request('https://www.youtube.com/watch?v='+keyword);
                data = String(data).split('var ytInitialPlayerResponse = ')[1].split('};')[0]+'}';
                data = JSON.parse(data).videoDetails;
                server.queue.push({
                    'title':data.title,
                    'owner':data.author,
                    'length':toTime(data.lengthSeconds),
                    'url':'https://www.youtube.com/watch?v='+data.videoId,
                    'image':data.thumbnail.thumbnails[0].url
                });
                if(server.queue.length==1) vc.join().then((c)=>this.ytdl(c));
                message.channel.send(this.playEmbed(1));
            } else {//Search Keyword
                let data = await request('https://www.youtube.com/results?search_query='+encodeURI(keyword)+'&sp=CAASAhAB');
                data = String(data).split('var ytInitialData = ')[1].split(';')[0];
                data = JSON.parse(data).contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
                if(data.length>0) {
                    server[message.author.id]=[];
                    for(let i=0;i<(data.length<10?data.length:10);i++) server[message.author.id].push({
                        'title':data[i].videoRenderer.title.runs[0].text,
                        'owner':data[i].videoRenderer.shortBylineText.runs[0].text,
                        'length':!data[i].videoRenderer.lengthText?"LIVE":data[i].videoRenderer.lengthText.simpleText,
                        'url':'https://www.youtube.com/watch?v='+data[0].videoRenderer.videoId,
                        'image':data[i].videoRenderer.thumbnail.thumbnails[0].url
                    });
                    this.selectMusic(keyword);
                } else message.channel.send(lang.music.play.nofind);
            }
        } catch(e) {
            console.log(lang.unexpected+' ('+e+')');
            message.channel.send(lang.unexpected);
        }
    },
    selectMusic : function(k) {
        let server = servers[message.guild.id];
        let vc = message.member.voice.channel;
        let author = message.author.id;
        let list = server[author];
        let c = 0;
        messageReaction.send(Embed.title_desc({
            'color':setting.color,
            'title':'`'+k+'` '+lang.music.play.search+' ( '+(c+1)+' / '+list.length+' )',
            'thumbnail':list[c].image,
            'desc':[
                '➯ '+lang.music.play.title+' : '+list[c].title,
                '➯ '+lang.music.play.owner+' : '+list[c].owner,
                '➯ '+lang.music.play.length+' : `'+list[c].length+'`'
            ].join('\n')
        }),['◀️','✅','▶️','❌'],(reaction,user,message)=>{
            if(user.id==author) {
                let emoji = reaction.emoji.name;
                if(emoji=='◀️' && c>0) c--;
                if(emoji=='▶️' && c<list.length-1) c++;
                if(emoji=='✅') {
                    message.delete();
                    server.queue.push({
                        'title':list[c].title,
                        'owner':list[c].owner,
                        'length':list[c].length,
                        'url':list[c].url,
                        'image':list[c].image
                    });
                    if(server.queue.length==1) vc.join().then((c)=>this.ytdl(c));
                    message.channel.send(this.playEmbed(1));
                } else if(emoji=='❌') {
                    message.delete();
                    message.channel.send(lang.music.select_canceled);
                } else message.edit(Embed.title_desc({
                    'color':setting.color,
                    'title':'`'+k+'` '+lang.music.play.search+' ( '+(c+1)+' / '+list.length+' )',
                    'thumbnail':list[c].image,
                    'desc':[
                        '➯ '+lang.music.play.title+' : '+list[c].title,
                        '➯ '+lang.music.play.owner+' : '+list[c].owner,
                        '➯ '+lang.music.play.length+' : `'+list[c].length+'`'
                    ].join('\n')
                }));
            }
        });
    },
    playEmbed : function(c) {
        let server = servers[message.guild.id];
        let music = server.queue[server.queue.length-c];
        return Embed.title_desc({
            'color':setting.color,
            'thumbnail':music.image,
            'title':lang.music.play.add.format(c),
            'desc':[
                '➯ '+lang.music.play.title+' : '+music.title,
                '➯ '+lang.music.play.owner+' : '+music.owner,
                '➯ '+lang.music.play.length+' : `'+music.length+'`'
            ]
        });
    },
    getList : function(num) {
        let server = servers[message.guild.id];
        let temp = (server.queue.length/num|0)==(server.queue.length/num)?0:1;
        let result = [];
        num=num?num:5;
        for(let i=0;i<(server.queue.length/num|0)+temp;i++) {
            if((server.queue.length-i*num)>num) {
                let list = [];
                for(let j=0;j<num;j++) list.push('`'+(i*num+j+1)+'` '+server.queue[i*num+j].title+' `'+server.queue[i*num+j].length+'`');
                result.push(list.join('\n'));
            } else {
                let list = [];
                for(let j=0;j<server.queue.length-i*num;j++) list.push('`'+(i*num+j+1)+'` '+server.queue[i*num+j].title+' `'+server.queue[i*num+j].length+'`');
                result.push(list.join('\n'));
            }
        }
        return result;
    },
    list : function(num) {
        let server = servers[message.guild.id];
        if(server.queue.length>0) {
            let result = this.getList(num);
            let author = message.author.username;
            let c = 0;
            messageReaction.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.music.list.queue+' ( '+(c+1)+' / '+result.length+' ) ',
                'desc':result[c].replace(/`1`/g,'▶️')+'\n\n➯ '+lang.music.list.status+' : '+(!server.repeat?!server.pause?'▶️':'⏸':'🔄')
            },message),['◀️','❌','▶️'],(reaction,user,message) => {
                if(author==user.username) {
                    if(reaction.emoji.name=='◀️' && c>0) c--;
                    if(reaction.emoji.name=='▶️' && c<result.length-1) c++;
                    if(reaction.emoji.name=='❌') message.delete();
                    else message.edit(Embed.title_desc({
                        'color':setting.color,
                        'title':lang.music.list.queue+' ( '+(c+1)+' / '+result.length+' ) ',
                        'desc':result[c].replace(/`1`/g,'▶️')+'\n\n➯ '+lang.music.list.status+' : '+(!server.repeat?!server.pause?'▶️':'⏸':'🔄')
                    },message));
                }
            });
        } else {
            message.channel.send(lang.music.list.nofind);
        }
    },
    stop : function() {
        let server = servers[message.guild.id];
        if(server.queue.length>0) {
            server.queue=[];
            if(server.pause==true) server.pause=false;
            if(server.repeat==true) server.repeat=false;
            server.dispatcher.end();
            message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':'Music Stopped',
                'desc':lang.music.stop.success
            }));
        } else message.channel.send(lang.music.stop.noplay);
    },
    skip : function(c) {
        c=!c?1:+c;
        let server = servers[message.guild.id];
        if(server.queue.length<1) message.channel.send(lang.music.skip.nofind);
        else if(c>server.queue.length) message.channel.send(lang.music.skip.toomuch);
        else {
            if(c>1) for(let i=0;i<c-1;i++) {
                if(server.repeat) server.queue.push(server.queue[0]);
                server.queue.shift();
            }
            server.dispatcher.end();
            message.channel.send(lang.music.skip.success.format(c));
        }
    },
    pause : function() {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) message.channel.send(lang.music.pause.voice);
        else if(!server.pause) {
            server.pause=true;
            server.dispatcher.pause();
            message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.music.pause.success,
                'thumbnail':server.queue[0].image,
                'desc':'`'+server.queue[0].title+'` '+lang.music.pause
            },message));
        } else message.channel.send(lang.music.pause.alreadypause);
    },
    resume : function() {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) message.channel.send(lang.music.resume.voice);
        else if(server.pause) {
            server.pause=false;
            message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.music.resume.success,
                'thumbnail':server.queue[0].image,
                'desc':'`'+server.queue[0].title+'` '+lang.music.resume
            }));
            server.dispatcher.resume();
        } else message.channel.send(lang.music.resume.alreadyplay);
    },
    repeat : function() {
        let server = servers[message.guild.id];
        if(!server.repeat) {
            server.repeat=true;
            message.channel.send(lang.music.repeat.on);
        } else {
            server.repeat=false;
            message.channel.send(lang.music.repeat.off);
        }
        return true;
    },
    mix : function() {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) message.channel.send(lang.music.join_voice);
        else if(!server.queue) message.channel.send(lang.music.no_queue_found);
        else if(server.queue.length<5) message.channel.send();
        else if(server.repeat) message.channel.send();
        else if(server.pause) message.channel.send();
        else {
            
            if(server.queue.length>0) vc.join().then((c)=>this.ytdl(c));
        }
    }
}
module.exports = Music;