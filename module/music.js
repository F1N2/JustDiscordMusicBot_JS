const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');

const Component = require('./component');
const Youtube = require('./youtube');
const Embed = require('./embed');
const Util = {error:(e,hide)=>{console.log(e);return{embeds:[Embed.default({color:'#ff0000',title:'오류 발생',desc:`오류가 발생했어요...\n\`\`\`js\n${e}\`\`\``,timestamp:true})],ephemeral:hide?true:false}}}
const { token, name, color, client_id, prefix } = {
    token: process.env.BOT_TOKEN,
    name: process.env.BOT_NAME,
    color: process.env.BOT_COLOR,
    client_id: process.env.BOT_ID,
    prefix: process.env.BOT_PREFIX
}

let servers = [];
let song_select = [];
let song_queue = [];
let message;
let isInteraction;

setSelectId = _ => {
    let res='',text='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for(let i=0;i<16;i++) res+=text[Math.random()*text.length|0];
    if(song_select.find(e=>e.id===res)) return setSelectId();
    else {
        song_select.push({id:res,queue:[],message:undefined,index:0});
        return res;
    }
}

setQueueId = _ => {
    let res='',text='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for(let i=0;i<16;i++) res+=text[Math.random()*text.length|0];
    if(song_queue.find(e=>e.id===res)) return setSelectId();
    else {
        song_queue.push({id:res,queue:[],message:undefined,index:0});
        return res;
    }
}

getUserId = _ => {
    return message.user?message.user.id:message.author.id;
}

const Music = {
    getData : _ => {return servers},
    getSelectData : _ => {return song_select},
    getQueueData : _ => {return song_queue},
    init : (msg) => {
        message = msg;
        isInteraction = msg.user?true:false;
        if(!servers[msg.guild.id]) servers[msg.guild.id]={queue:[],repeat:false,pause:false,channel:undefined};
        return true;
    },
    fail : (title,desc) => {
        return {embeds:[
            Embed.default({
                color:'#ff0000',
                title:title,
                desc:desc,
                timestamp:true
            })
        ],ephemeral:true}
    },
    ytdl : (connection,channel_id) => {
        let server = servers[message.guild.id];
        // const resource = createAudioResource(ytdl(server.queue[0].url),{inlineVolume:true});
        const resource = createAudioResource(ytdl(server.queue[0].url,{quality:'highestaudio',highWaterMark:1<<25}),{inlineVolume:true});
        resource.volume.setVolume(0.2);
        server.player = createAudioPlayer();
        connection.subscribe(server.player);
        server.channel = channel_id;
        server.player.play(resource);
        server.player.on('idle',_=>{
            if(server.repeat) server.queue.push(server.queue[0]);
            server.queue.shift();
            if(server.queue.length>0) Music.ytdl(connection);
            else {
                servers[message.guild.id]={queue:[],repeat:false,pause:false,channel:undefined};
                connection.destroy();
            }
        });
    },
    play : async url => {
        let vc = message.member.voice.channel;
        let server = servers[message.guild.id];
        if(!vc) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력하세요.');
        let p = vc.permissionsFor(message.client.user)
        if(!p.has('CONNECT')) return Music.fail('권한이 부족함','보이스챗에 들어갈 수 있는 권한이 없습니다.');
        if(!p.has('SPEAK')) return Music.fail('권한이 부족함','보이스챗에서 말할 수 있는 권한이 없습니다.');
        if(server.channel && server.channel!==vc.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        try {
            let server = servers[message.guild.id];
            if(url.indexOf('https://')==0) {
                let data = await Youtube.url(url);
                for(let i=0;i<data.length;i++) server.queue.push(data[i]);
                const voiceConnection = joinVoiceChannel({
                    channelId:vc.id,
                    guildId:message.channel.guild.id,
                    adapterCreator:message.channel.guild.voiceAdapterCreator
                });
                if(server.queue.length<=data.length) Music.ytdl(voiceConnection,vc.id);
                return {embeds:[
                    Embed.default({
                        color:color,
                        title:`${data.length}개의 곡${data.length>1?'들':''}이 재생목록에 추가되었습니다.`,
                        desc:[
                            `➯ 제목 : ${data[0].title}`,
                            `➯ 게시자 : ${data[0].owner}`,
                            `➯ 길이 : \`${data[0].length}\``
                        ].join('\n'),
                        thumbnail:data[0].image,
                        timestamp:true
                    })
                ],components:[
                    Component.button([
                        {
                            title:'URL',
                            style:'LINK',
                            url:url
                        }
                    ])
                ]};
            } else {
                let data = await Youtube.search(url,10);
                let id = setSelectId();
                let select = song_select[song_select.findIndex(e=>e.id===id)];
                select.queue = data;
                select.title = url;
                select.message = await message.channel.send({embeds:[
                    Embed.default({
                        color:color,
                        title:`\`${select.title}\` 검색목록 ( ${select.index+1} / ${select.queue.length} )`,
                        desc:[
                            `➯ 제목 : ${select.queue[select.index].title}`,
                            `➯ 게시자 : ${select.queue[select.index].owner}`,
                            `➯ 길이 : \`${select.queue[select.index].length}\``
                        ].join('\n'),
                        thumbnail:select.queue[select.index].image,
                        timestamp:true
                    })
                ],components:[
                    Component.button([
                        {
                            id:`SELECT_PREVIOUS_${getUserId()}_${select.id}`,
                            title:'Previous',
                            style:'SECONDARY'
                        },
                        {
                            id:`SELECT_NEXT_${getUserId()}_${select.id}`,
                            title:'Next',
                            style:'SECONDARY'
                        },
                        {
                            id:`SELECT_SELECT_${getUserId()}_${select.id}`,
                            title:'Select',
                            style:'SUCCESS'
                        },
                        {
                            id:`SELECT_CANCEL_${getUserId()}_${select.id}`,
                            title:'Cancel',
                            style:'DANGER'
                        },
                        {
                            title:'URL',
                            style:'LINK',
                            url:select.queue[select.index].url
                        }
                    ])
                ]});
                return {embeds:[
                    Embed.default({
                        color:color,
                        title:'성공적으로 곡 선택 메세지가 채널에 전송됨',
                        desc:'성공적으로 곡 선택 메세지가 채널에 전송되었습니다.',
                        timestamp:true
                    })
                ],ephemeral:true,isHide:!isInteraction};
            }
        } catch(e) {
            return Util.error(e,true);
        }
    },
    playContext : async url => {
        if(url.indexOf('https://')==0) return await Music.play(url);
        else return Music.fail('채팅에 링크가 존재하지 않거나 유효하지 않음','채팅에 링크가 존재하지 않거나 유효하지 않아서 노래를 재생할 수 없습니다.');
    },
    selectButton : (id,num) => {
        let server = servers[message.guild.id];
        let select = song_select[song_select.findIndex(e=>e.id===id)];
        if(num===0) {
            select.message.delete();
            song_select.splice(song_select.findIndex(e=>e.id===id),1);
        } else if(num===2) {
            let vc = message.member.voice.channel;
            server.queue.push(select.queue[select.index]);
            const voiceConnection = joinVoiceChannel({
                channelId:vc.id,
                guildId:message.channel.guild.id,
                adapterCreator:message.channel.guild.voiceAdapterCreator
            });
            if(server.queue.length<=1) Music.ytdl(voiceConnection,vc.id);
            select.message.edit({embeds:[
                Embed.default({
                    color:color,
                    title:`선택한 곡이 재생목록에 추가됨`,
                    desc:[
                        `➯ 제목 : ${select.queue[select.index].title}`,
                        `➯ 게시자 : ${select.queue[select.index].owner}`,
                        `➯ 길이 : \`${select.queue[select.index].length}\``
                    ].join('\n'),
                    thumbnail:select.queue[select.index].image,
                    timestamp:true
                })
            ],components:[
                Component.button([
                    {
                        title:'URL',
                        style:'LINK',
                        url:select.queue[select.index].url
                    }
                ])
            ]});
            song_select.splice(song_select.findIndex(e=>e.id===id),1);
        } else {
            select.index+=num;
            select.message.edit({embeds:[
                Embed.default({
                    color:color,
                    title:`\`${select.title}\` 검색목록 ( ${select.index+1} / ${select.queue.length} )`,
                    desc:[
                        `➯ 제목 : ${select.queue[select.index].title}`,
                        `➯ 게시자 : ${select.queue[select.index].owner}`,
                        `➯ 길이 : \`${select.queue[select.index].length}\``
                    ].join('\n'),
                    thumbnail:select.queue[select.index].image,
                    timestamp:true
                })
            ],components:[
                Component.button([
                    {
                        id:`SELECT_PREVIOUS_${getUserId()}_${select.id}`,
                        title:'Previous',
                        style:'SECONDARY',
                        disabled:select.index==0
                    },
                    {
                        id:`SELECT_NEXT_${getUserId()}_${select.id}`,
                        title:'Next',
                        style:'SECONDARY',
                        disabled:select.index==select.queue.length-1
                    },
                    {
                        id:`SELECT_SELECT_${getUserId()}_${select.id}`,
                        title:'Select',
                        style:'SUCCESS'
                    },
                    {
                        id:`SELECT_CANCEL_${getUserId()}_${select.id}`,
                        title:'Cancel',
                        style:'DANGER'
                    },
                    {
                        title:'URL',
                        style:'LINK',
                        url:select.queue[select.index].url
                    }
                ])
            ]});
        }
    },
    skip : (num = 1) => {
        num = +num;
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력해주세요.');
        if(server.channel && server.channel!==message.member.voice.channel.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        if(server.queue.length<1) return Music.fail('재생목록에 곡이 없음','재생목록에 곡이 없어서 스킵을 할 수 없습니다.');
        if(server.queue.length<num) return Music.fail('입력한 값이 재생목록에 있는 곡의 수보다 큼','입력한 값이 너무 커서 스킵을 할 수 없습니다.');
        for(let i=0;i<num-1;i++) {
            if(server.repeat) server.queue.push(server.queue[0]);
            server.queue.shift();
        }
        server.player.stop();
        return {embeds:[
            Embed.default({
                color:color,
                title:'곡 스킵됨',
                desc:`재생목록에 있는 ${num}개의 곡이 스킵되었습니다.`,
                timestamp:true
            })
        ]};
    },
    stop : _ => {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력해주세요.');
        if(server.channel && server.channel!==message.member.voice.channel.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        if(server.queue.length<1) return Music.fail('재생목록에 곡이 없음','재생목록에 곡이 없어서 일시정지를 할 수 없습니다.');
        servers[message.guild.id].queue=[];
        server.player.stop();
        return {embeds:[
            Embed.default({
                color:color,
                title:'재생 중지됨',
                desc:'곡 재생이 중지되었습니다.',
                timestamp:true
            })
        ]};
    },
    pause : _ => {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력해주세요.');
        if(server.channel && server.channel!==message.member.voice.channel.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        if(server.queue.length<1) return Music.fail('재생목록에 곡이 없음','재생목록에 곡이 없어서 일시정지를 할 수 없습니다.');
        if(server.pause) return Music.fail('곡이 이미 일시중지됨','이미 곡이 일시중지되어 있습니다.');
        server.pause = true;
        server.player.pause();
        return {embeds:[
            Embed.default({
                color:color,
                title:'곡 일시중지됨',
                desc:'현재 재생하고 있는 곡이 일시중지되었습니다.',
                timestamp:true
            })
        ]};
    },
    resume : _ => {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력해주세요.');
        if(server.channel && server.channel!==message.member.voice.channel.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        if(server.queue.length<1) return Music.fail('재생목록에 곡이 없음','재생목록에 곡이 없어서 일시정지를 할 수 없습니다.');
        if(!server.pause) return Music.fail('곡이 이미 재생중','이미 곡이 재생중입니다.');
        server.pause = false;
        server.player.unpause();
        return {embeds:[
            Embed.default({
                color:color,
                title:'곡 재생됨',
                desc:'일시중지된 곡을 다시 재생합니다.',
                timestamp:true
            })
        ]};
    },
    loop : _ => {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력해주세요.');
        if(server.channel && server.channel!==message.member.voice.channel.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        if(server.queue.length<1) return Music.fail('재생목록에 곡이 없음','재생목록에 곡이 없어서 반복 설정을 할 수 없습니다.');
        server.repeat = server.repeat ? false : true;
        return {embeds:[
            Embed.default({
                color:color,
                title:`반복 ${server.repeat?'실행':'중지'}됨`,
                desc:`반복 기능을 ${server.repeat?'실행':'중지'}하였습니다.`,
                timestamp:true
            })
        ]};
    },
    shuffle : _ => {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력해주세요.');
        if(server.channel && server.channel!==message.member.voice.channel.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        if(server.queue.length<1) return Music.fail('재생목록에 곡이 없음','재생목록에 곡이 없어서 셔플할 수 없습니다.');
        if(server.queue.length<3) return Music.fail('재생목록에 곡이 적음','재생목록에 곡이 적어서 셔플할 수 없습니다.');
        let new_queue = [server.queue[0]];
        server.queue.shift();
        server.queue.sort(()=>Math.random()-0.5);
        for(let i=0;i<server.queue.length;i++) new_queue.push(server.queue[i]);
        server.queue=new_queue;
        return {embeds:[
            Embed.default({
                color:color,
                title:'곡 셔플됨',
                desc:'재생목록에 있는 곡들이 셔플되었습니다.',
                timestamp:true
            })
        ]};
    },
    remove : (index,num = 1) => {
        index = index==0 ? 1 : index<0 ? -index : +index;
        num = num==0 ? 1 : num<0 ? -num : +num;
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력해주세요.');
        if(server.channel && server.channel!==message.member.voice.channel.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        if(server.queue.length<1) return Music.fail('재생목록에 곡이 없음','재생목록에 곡이 없어서 재생목록에 있는 곡을 지울 수 없습니다.');
        if(server.queue<index+num-1) return Music.fail('지울 곡 범위가 재생목록의 곡 범위를 넘음','지울 곡 범위가 재생목록의 곡 범위를 넘어서 재생목록에 있는 곡을 지울 수 없습니다.');
        server.queue.splice(index-1,num);
        if(server.queue==num) server.player.stop();
        return {embeds:[
            Embed.default({
                color:color,
                title:'곡 삭제됨',
                desc:'재생목록에 있는 특정 곡이 제거되었습니다.',
                timestamp:true
            })
        ]};
    },
    getQueue : (data,num) => {
        let temp = (data.length/num|0)==(data.length/num)?0:1;
        let result = [];
        num=num?num:5;
        for(let i=0;i<(data.length/num|0)+temp;i++) {
            if((data.length-i*num)>num) {
                let list = [];
                for(let j=0;j<num;j++) list.push(`\`${i*num+j+1}\` ${data[i*num+j].title} \`${data[i*num+j].length}\``);
                result.push(list.join('\n'));
            } else {
                let list = [];
                for(let j=0;j<data.length-i*num;j++) list.push(`\`${i*num+j+1}\` ${data[i*num+j].title} \`${data[i*num+j].length}\``);
                result.push(list.join('\n'));
            }
        }
        return result;
    },
    queue : async _ => {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력해주세요.');
        if(server.channel && server.channel!==message.member.voice.channel.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        if(server.queue.length<1) return Music.fail('재생목록에 곡이 없음','재생목록에 곡이 없어서 재생목록을 볼 수 없습니다.');
        let id = setQueueId();
        let queue = song_queue[song_queue.findIndex(e=>e.id===id)];
        queue.queue = Music.getQueue(server.queue,10);
        queue.message = await message.channel.send({embeds:[
            Embed.default({
                color:color,
                title:'재생목록',
                desc:queue.queue[queue.index].replace(/\`1\`/g,server.pause?'⏸':server.repeat?'🔄':'▶️'),
                timestamp:true
            })
        ],components:[
            Component.button([
                {
                    id:`QUEUE_PREVIOUS_${getUserId()}_${queue.id}`,
                    title:'Previous',
                    style:'SECONDARY',
                    disabled:queue.index==0
                },
                {
                    id:`QUEUE_NEXT_${getUserId()}_${queue.id}`,
                    title:'Next',
                    style:'SECONDARY',
                    disabled:queue.index==queue.queue.length-1
                },
                {
                    id:`QUEUE_DELETE_${getUserId()}_${queue.id}`,
                    title:'Delete Message',
                    style:'DANGER'
                }
            ])
        ]});
        return {embeds:[
            Embed.default({
                color:color,
                title:'재생목록 성공적으로 전송됨',
                desc:'재생목록이 성공적으로 현재 채널에 전송되었습니다.',
                timestamp:true
            })
        ],ephemeral:true,isHide:!isInteraction};
    },
    queueButon : (id,num) => {
        let server = servers[message.guild.id];
        let queue = song_queue[song_queue.findIndex(e=>e.id===id)];
        if(num==0) {
            queue.message.delete();
            song_queue.splice(song_queue.findIndex(e=>e.id===id),1);
        } else {
            queue.index+=num;
            queue.message.edit({embeds:[
                Embed.default({
                    color:color,
                    title:`재생목록 ( ${queue.index+1} / ${queue.queue.length} )`,
                    desc:queue.queue[queue.index].replace(/\`1\`/g,server.pause?'⏸':server.repeat?'🔄':'▶️'),
                    timestamp:true
                })
            ],components:[
                Component.button([
                    {
                        id:`QUEUE_PREVIOUS_${getUserId()}_${queue.id}`,
                        title:'Previous',
                        style:'SECONDARY',
                        disabled:queue.index==0
                    },
                    {
                        id:`QUEUE_NEXT_${getUserId()}_${queue.id}`,
                        title:'Next',
                        style:'SECONDARY',
                        disabled:queue.index==queue.queue.length-1
                    },
                    {
                        id:`QUEUE_DELETE_${getUserId()}_${queue.id}`,
                        title:'Delete Message',
                        style:'DANGER'
                    }
                ])
            ]});
        }
    },
    nowPlay : _ => {
        let server = servers[message.guild.id];
        if(!message.member.voice.channel) return Music.fail('보이스챗 정보를 가지고 오지 못함','보이스챗에 들어간 후에 명령어를 다시 입력해주세요.');
        if(server.channel && server.channel!==message.member.voice.channel.id) return Music.fail('봇이 다른 보이스챗에 있음','봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.');
        if(server.queue.length<1) return Music.fail('재생목록에 곡이 없음','재생목록에 곡이 없어서 현재 재생중인 곡을 볼 수 없습니다.');
        return {embeds:[
            Embed.default({
                color:color,
                title:`현재 재생중인 곡`,
                thumbnail:server.queue[0].image,
                desc:[
                    `➯ 제목 : ${server.queue[0].title}`,
                    `➯ 게시자 : ${server.queue[0].owner}`,
                    `➯ 길이 : \`${server.queue[0].length}\``,
                    `➯ 상태 : ${server.pause?'⏸':server.repeat?'🔄':'▶️'}`
                ].join('\n'),
                timestamp:true
            })
        ],components:[
            Component.button([
                {
                    title:'URL',
                    style:'LINK',
                    url:server.queue[0].url
                }
            ])
        ],ephemeral:true};
    }
}

module.exports = Music;