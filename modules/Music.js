const request = require('request-promise');
const ytdl = require('ytdl-core');
const Embed = require('./Embed');
const Util = require('./Util');
const File = require('./File');

const setting = JSON.parse(File.read('./Data/setting.json'));
const lang = JSON.parse(File.read('./Data/lang.json'))[setting.lang];

let message,messageReaction={},servers={};

/*

Require this source in index.js

let messageReaction = {};

client.on("messageReactionAdd", function(reaction, user){
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
        return message.channel.send(str).then((message)=>{
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
    sec=+sec;
    let h = sec/3600|0;
    let m = sec/60%60|0;
    let s = sec%60;
    h=h>0?h+':':'';
    m=m<10&&h!=0?'0'+m:m;
    s=s<10?'0'+s:s;
    return h+m+':'+s;
}

const Music = {
    init : function(msg,msgReaction) {
        Util.init(msg);
        let customList = File.read('./Data/customList.json')?JSON.parse(File.read('./Data/customList.json')):{};
        message = msg;
        messageReaction = msgReaction;
        if(!servers[message.guild.id]) servers[message.guild.id]={queue:[],repeat:false,pause:false};
        if(!customList[message.author.id]) customList[message.author.id]=[];
        File.save('./Data/customList.json',JSON.stringify(customList,null,4));
        return true;
    },
    nowPlay : function() {
        let server = servers[message.guild.id]
        if(server.queue.length>0) {
            return message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.music.np.np,
                'thumbnail':server.queue[0].image,
                'desc':[
                    lang.music.np.title.format(server.queue[0].title),
                    lang.music.np.owner.format(server.queue[0].owner),
                    lang.music.np.length.format(toTime(server.dispatcher.streamTime/1000|0),server.queue[0].length),
                    lang.music.np.status.format(!server.repeat?!server.pause?'▶️':'⏸':'🔄')
                ].join('\n')
            }));
        } else return message.channel.send(lang.music.no_song_play);
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
        if(!vc) return message.channel.send(lang.music.play.voice);
        let p = vc.permissionsFor(message.client.user);
        if(!p.has('CONNECT')) return message.channel.send(lang.music.play.connect);
        else if(!p.has('SPEAK')) return message.channel.send(lang.music.play.speak);
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
                if(server.queue.length<=data.length) vc.join().then((c)=>this.ytdl(c));
                return message.channel.send(this.playEmbed(data.length));
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
                if(server.queue.length<=1) vc.join().then((c)=>this.ytdl(c));
                return message.channel.send(this.playEmbed(1));
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
                } else return message.channel.send(lang.music.play.nofind);
            }
        } catch(e) {
            console.log(lang.unexpected+' ('+e+')');
            return message.channel.send(lang.unexpected);
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
            'title':lang.music.play.search.format(k,c+1,list.length),
            'thumbnail':list[c].image,
            'desc':[
                lang.music.play.title.format(list[c].title),
                lang.music.play.owner.format(list[c].owner),
                lang.music.play.length.format(list[c].length)
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
                    if(server.queue.length<=1) vc.join().then((c)=>this.ytdl(c));
                    return message.channel.send(this.playEmbed(1));
                } else if(emoji=='❌') {
                    message.delete();
                    return message.channel.send(lang.music.select_canceled);
                } else message.edit(Embed.title_desc({
                    'color':setting.color,
                    'title':lang.music.play.search.format(k,c+1,list.length),
                    'thumbnail':list[c].image,
                    'desc':[
                        lang.music.play.title.format(list[c].title),
                        lang.music.play.owner.format(list[c].owner),
                        lang.music.play.length.format(list[c].length)
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
                lang.music.play.title.format(music.title),
                lang.music.play.owner.format(music.owner),
                lang.music.play.length.format(music.length)
            ]
        });
    },
    getList : function(data,num) {
        let temp = (data.length/num|0)==(data.length/num)?0:1;
        let result = [];
        num=num?num:5;
        for(let i=0;i<(data.length/num|0)+temp;i++) {
            if((data.length-i*num)>num) {
                let list = [];
                for(let j=0;j<num;j++) list.push('`'+(i*num+j+1)+'` '+data[i*num+j].title+' `'+data[i*num+j].length+'`');
                result.push(list.join('\n'));
            } else {
                let list = [];
                for(let j=0;j<data.length-i*num;j++) list.push('`'+(i*num+j+1)+'` '+data[i*num+j].title+' `'+data[i*num+j].length+'`');
                result.push(list.join('\n'));
            }
        }
        return result;
    },
    list : function(num,file) {
        let server = servers[message.guild.id];
        if(file) return Util.sendTextFile(lang.music.list.queue+'\n\n'+server.queue.map((e,i)=>(i==0?!server.pause?'▶️':'⏸':i+1)+' : '+e.title+' ('+e.length+')').join('\n'),'list.txt');
        else {
            if(server.queue.length>0) {
                let result = this.getList(server.queue,num);
                let author = message.author.username;
                let c = 0;
                messageReaction.send(Embed.title_desc({
                    'color':setting.color,
                    'title':lang.music.list.queue_with_count.format(c+1,result.length),
                    'desc':result[c].replace(/`1`/g,'▶️')+'\n\n'+lang.music.list.status.format(!server.repeat?!server.pause?'▶️':'⏸':'🔄')
                },message),['◀️','❌','▶️'],(reaction,user,message) => {
                    if(author==user.username) {
                        if(reaction.emoji.name=='◀️' && c>0) c--;
                        if(reaction.emoji.name=='▶️' && c<result.length-1) c++;
                        if(reaction.emoji.name=='❌') message.delete();
                        else message.edit(Embed.title_desc({
                            'color':setting.color,
                            'title':lang.music.list.queue_with_count.format(c+1,result.length),
                            'desc':result[c].replace(/`1`/g,'▶️')+'\n\n'+lang.music.list.status.format(!server.repeat?!server.pause?'▶️':'⏸':'🔄')
                        },message));
                    }
                });
            } else return message.channel.send(lang.music.list.nofind);
        }
    },
    stop : function() {
        let server = servers[message.guild.id];
        if(server.queue.length>0) {
            server.queue=[];
            if(server.pause==true) server.pause=false;
            if(server.repeat==true) server.repeat=false;
            server.dispatcher.end();
            return message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':'Music Stopped',
                'desc':lang.music.stop.success
            }));
        } else return message.channel.send(lang.music.stop.noplay);
    },
    skip : function(c) {
        c=!c?1:+c;
        let server = servers[message.guild.id];
        if(server.queue.length<1) return message.channel.send(lang.music.skip.nofind);
        else if(c>server.queue.length) return message.channel.send(lang.music.skip.toomuch);
        else {
            if(c>1) for(let i=0;i<c-1;i++) {
                if(server.repeat) server.queue.push(server.queue[0]);
                server.queue.shift();
            }
            server.dispatcher.end();
            return message.channel.send(lang.music.skip.success.format(c));
        }
    },
    pause : function() {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return message.channel.send(lang.music.pause.voice);
        else if(!server.pause) {
            server.pause=true;
            server.dispatcher.pause();
            return message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.music.pause.success,
                'thumbnail':server.queue[0].image,
                'desc':'`'+server.queue[0].title+'` '+lang.music.pause.paused
            },message));
        } else return message.channel.send(lang.music.pause.alreadypause);
    },
    resume : function() {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return message.channel.send(lang.music.resume.voice);
        else if(server.pause) {
            server.pause=false;
            server.dispatcher.resume();
            return message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.music.resume.success,
                'thumbnail':server.queue[0].image,
                'desc':'`'+server.queue[0].title+'` '+lang.music.resume.resumed
            }));
        } else return message.channel.send(lang.music.resume.alreadyplay);
    },
    repeat : function() {
        let server = servers[message.guild.id];
        if(!server.repeat) {
            server.repeat=true;
            return message.channel.send(lang.music.repeat.on);
        } else {
            server.repeat=false;
            return message.channel.send(lang.music.repeat.off);
        }
        return true;
    },
    mix : function() {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return message.channel.send(lang.music.join_voice);
        else if(!server.queue) return message.channel.send(lang.music.no_queue_found);
        else if(server.queue.length<5) return message.channel.send();
        else if(server.repeat) return message.channel.send();
        else if(server.pause) return message.channel.send();
        else {
            
            if(server.queue.length>0) vc.join().then((c)=>this.ytdl(c));
        }
    },
    customList : {
        help : function() {
            return message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.help.music.customList.title,
                'desc':lang.help.music.customList.desc.join('\n').format(setting.prefix)
            }));
        },
        add : async function(keyword) {
            try {
                let customList = File.read('./Data/customList.json')?JSON.parse(File.read('./Data/customList.json')):{};
                if(keyword.indexOf('https://')==0 && (keyword.indexOf('playlist?')!=-1 || keyword.indexOf('&list')!=-1)) {//Playlist
                    keyword = keyword.indexOf('playlist?')!=-1?keyword.split('?list=')[1]:keyword.split('&list=')[1];//Get Playlist Id
                    let data = await request('https://www.youtube.com/playlist?list='+keyword);
                    data = String(data).split('var ytInitialData = ')[1].split(';')[0];
                    data = JSON.parse(data).contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
                    for(let i=0;i<data.length;i++) customList[message.author.id].push({
                        'title':data[i].playlistVideoRenderer.title.runs[0].text,
                        'owner':data[i].playlistVideoRenderer.shortBylineText.runs[0].text,
                        'length':data[i].playlistVideoRenderer.lengthText.simpleText,
                        'url':'https://www.youtube.com/watch?v='+data[i].playlistVideoRenderer.videoId,
                        'image':data[i].playlistVideoRenderer.thumbnail.thumbnails[0].url
                    });
                    File.save('./Data/customList.json',JSON.stringify(customList,null,4));
                    return message.channel.send(Embed.title_desc({
                        'color':setting.color,
                        'title':lang.music.customList.add.title,
                        'desc':lang.music.customList.add.desc_playlist.format(data.length)
                    }));
                } else if(keyword.indexOf('https://')==0) {//Video Link
                    keyword = keyword.indexOf('youtu.be')!=-1?keyword.split('/')[3]:keyword.split('?v=')[1];//Get Video Id
                    let data = await request('https://www.youtube.com/watch?v='+keyword);
                    data = String(data).split('var ytInitialPlayerResponse = ')[1].split('};')[0]+'}';
                    data = JSON.parse(data).videoDetails;
                    customList[message.author.id].push({
                        'title':data.title,
                        'owner':data.author,
                        'length':toTime(data.lengthSeconds),
                        'url':'https://www.youtube.com/watch?v='+data.videoId,
                        'image':data.thumbnail.thumbnails[0].url
                    });
                    File.save('./Data/customList.json',JSON.stringify(customList,null,4));
                    return message.channel.send(Embed.title_desc({
                        'color':setting.color,
                        'thumbnail':data.thumbnail.thumbnails[0].url,
                        'title':lang.music.customList.add.title,
                        'desc':lang.music.customList.add.desc.format(data.title)
                    }));
                } else {//Search Keyword
                    //TODO
                }
            } catch(e) {
                console.log(lang.unexpected+' ('+e+')');
                return message.channel.send(lang.unexpected);
            }
        },
        play : function() {
            let server = servers[message.guild.id];
            let vc = message.member.voice.channel;
            let list = JSON.parse(File.read('./Data/customList.json'))[message.author.id];
            if(!vc) return message.channel.send(lang.music.customList.play.voice);
            let p = vc.permissionsFor(message.client.user);
            if(!p.has('CONNECT')) return message.channel.send(lang.music.customList.play.connect);
            else if(!p.has('SPEAK')) return message.channel.send(lang.music.customList.play.speak);
            else if(list.length<1) return message.channel.send(lang.music.customList.play.list_empty);
            else {
                if(server.queue.length<=1) vc.join().then((c)=>Music.ytdl(c));
                for(let i=0;i<list.length;i++) server.queue.push(list[i]);
                return message.channel.send(Music.playEmbed(list.length));
            }
        },
        list : function(num,file) {
            let list = JSON.parse(File.read('./Data/customList.json'))[message.author.id];
            if(file) return Util.sendTextFile(lang.music.customList.list.queue+'\n\n'+list.map((e,i)=>(i+1)+' : '+e.title+' ('+e.length+')').join('\n'),'list.txt');
            else {
                if(list.length>0) {
                    let result = Music.getList(list,num);
                    let author = message.author.id;
                    let c = 0;
                    messageReaction.send(Embed.title_desc({
                        'color':setting.color,
                        'title':lang.music.customList.list.queue_with_count.format(c+1,result.length),
                        'desc':result[c]
                    },message),['◀️','❌','▶️'],(reaction,user,message) => {
                        if(author==user.id) {
                            if(reaction.emoji.name=='◀️' && c>0) c--;
                            if(reaction.emoji.name=='▶️' && c<result.length-1) c++;
                            if(reaction.emoji.name=='❌') message.delete();
                            else message.edit(Embed.title_desc({
                                'color':setting.color,
                                'title':lang.music.customList.list.queue_with_count.format(c+1,result.length),
                                'desc':result[c]
                            },message));
                        }
                    });
                } else return message.channel.send(lang.music.customList.list.nofind);
            }
        },
        remove : function(num) {
            let list = JSON.parse(File.read('./Data/customList.json'));
            if(list[message.author.id].length<num) return message.channel.send(lang.music.customList.remove.too_high);
            else {
                let data = list[message.author.id][num-1];
                list[message.author.id].splice(num-1,1);
                File.save('./Data/customList.json',JSON.stringify(list,null,4));
                return message.channel.send(Embed.title_desc({
                    'color':setting.color,
                    'thumbnail':data.image,
                    'title':lang.music.customList.remove.title,
                    'desc':lang.music.customList.remove.desc.format(data.title)
                }));
            }
        },
        clear : function() {
            let list = JSON.parse(File.read('./Data/customList.json'));
            list[message.author.id]=[];
            File.save('./Data/customList.json',JSON.stringify(list,null,4));
            return message.channel.send(Embed.title_desc({
                'color':setting.color,
                'title':lang.music.customList.clear.title,
                'desc':lang.music.customList.clear.desc
            }));
        }
    }
}
module.exports = Music;