// const { token, name, color, client_id, prefix } = require('./setting/config.json');
const dotenv = require('dotenv');
dotenv.config();
const { token, name, color, client_id, prefix } = {
    token: process.env.BOT_TOKEN,
    name: process.env.BOT_NAME,
    color: process.env.BOT_COLOR,
    client_id: process.env.BOT_ID,
    prefix: process.env.BOT_PREFIX
}
const { Client, Intents } = require('discord.js');
const client = new Client({
    shards:'auto',
    intents:[
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]
});

//Modules
// require('./module/set_interaction')(token,client_id);
const Embed = require('./module/embed');
const Music = require('./module/music');
const Util = require('./module/util');

client.on('ready',_=>{
    console.log(`Logged in as ${client.user.tag}!`);
    let count=0;
    setInterval(()=>{
        let str = [`help : ${prefix}?`,`Use '/play' to play music`,`JustDiscordMusicBot`];
        client.user.setActivity(str[count]);
        count = count<str.length-1 ? count+1 : 0;
    },10000);
});

client.on('interactionCreate',async interaction => {

    Music.init(interaction);

    if(interaction.isContextMenu()) {
        if(interaction.commandName==='Add to Queue') interaction.reply(await Music.playContext(interaction.channel.messages.cache.get(interaction.targetId).content));
    }

    if(interaction.isButton()) {
        let id = interaction.customId.split('_');
        /*
            id[0] : Main Command
            id[1] : Sub Command
            id[2] : User ID
            id[3] : Data
        */
        if(id[2]!==interaction.user.id) return;

        if(id[0]==='QUEUE') {
            if(!Music.getQueueData().find(e=>e.id===id[3])) return;
            if(id[1]==='PREVIOUS') Music.queueButon(id[3],-1);
            if(id[1]==='NEXT') Music.queueButon(id[3],1);
            if(id[1]==='DELETE') Music.queueButon(id[3],0);
        }
        if(id[0]==='SELECT') {
            if(!Music.getSelectData().find(e=>e.id===id[3])) return;
            if(id[1]==='PREVIOUS') Music.selectButton(id[3],-1);
            if(id[1]==='NEXT') Music.selectButton(id[3],1);
            if(id[1]==='CANCEL') Music.selectButton(id[3],0);
            if(id[1]==='SELECT') Music.selectButton(id[3],2);
        }

        await interaction.deferUpdate();
    }

    if(interaction.isCommand()) {
        if(interaction.commandName==='play') interaction.reply(await Music.play(interaction.options.getString('keyword')));
        if(interaction.commandName==='skip') interaction.reply(Music.skip(interaction.options.getInteger('count')||1));
        if(interaction.commandName==='stop') interaction.reply(Music.stop());
        if(interaction.commandName==='pause') interaction.reply(Music.pause());
        if(interaction.commandName==='resume' || interaction.commandName==='unpause') interaction.reply(Music.resume());
        if(interaction.commandName==='loop' || interaction.commandName==='repeat') interaction.reply(Music.loop());
        if(interaction.commandName==='shuffle') interaction.reply(Music.shuffle());
        if(interaction.commandName==='remove') interaction.reply(Music.remove(interaction.options.getInteger('index'),interaction.options.getInteger('count')||1));
        if(interaction.commandName==='queue') interaction.reply(await Music.queue());
        if(interaction.commandName==='nowplay') interaction.reply(Music.nowPlay());
    }

});

client.on('messageCreate',async message=>{
    Music.init(message);
    if(message.content.startsWith(prefix)) {
        let cmd = message.content.substr(prefix.length);

        if(cmd==='?' || cmd==='help' || cmd==='?????????') message.channel.send({embeds:[
            Embed.field({
                color:color,
                title:`${name} Command Help`,
                fields:[
                    {name:'Help',value:[
                        `\`${prefix}?\``,
                        `\`${prefix}help\``,
                        `\`${prefix}?????????\``
                    ].join('\n')},
                    {name:'Music',value:[
                        `\`${prefix}play\` (keyword|url) : ?????? ???????????????`,
                        `\`${prefix}skip\` <count> : ?????? ???????????????.`,
                        `\`${prefix}stop\` : ??? ????????? ???????????????.`,
                        `\`${prefix}pause\` : ?????? ???????????? ?????? ?????? ?????????????????????.`,
                        `\`${prefix}resume\` : ??????????????? ?????? ?????? ???????????????.`,
                        `\`${prefix}loop\` : ?????? ???????????? ??????????????? ?????? ????????? ???????????????.`,
                        `\`${prefix}shuffle\` : ?????? ??????????????? ?????? ????????? ????????????.`,
                        `\`${prefix}remove <index> <count>\` : ??????????????? ?????? ????????? ?????? ????????????.`,
                        `\`${prefix}queue\` : ??????????????? ?????? ??? ????????? ???????????????.`,
                        `\`${prefix}np\` : ?????? ???????????? ??? ????????? ???????????????.`,
                        ``,
                        `\`<>?????? ?????? ?????? ????????? ????????????.\``
                    ].join('\n')},
                    {name:'Favorite Music',value:[
                        '`?????????`'
                    ].join('\n')}
                ],
                thumbnail:client.user.avatarURL(),
                timestamp:true
            })
        ]})
        if(cmd.startsWith('play ') || cmd.startsWith('p ')) {
            let res = await Music.play(cmd.replace(/play /g,'').replace(/p /g,''));
            if(!res.isHide) message.channel.send(res);
        }
        if(cmd.startsWith('skip') || cmd.startsWith('sk')) message.channel.send(Music.skip(+cmd.replace(/skip/g,'').replace(/sk/g,'')||1));
        if(cmd==='stop' || cmd==='st') message.channel.send(Music.stop());
        if(cmd==='pause') message.channel.send(Music.pause());
        if(cmd==='resume' || cmd==='unpause') message.channel.send(Music.resume());
        if(cmd==='loop' || cmd==='repeat') message.channel.send(Music.loop());
        if(cmd==='shuffle' || cmd==='mix') message.channel.send(Music.shuffle());
        if(cmd.startsWith('remove')) message.channel.send(Music.remove(+cmd.split(' ')[1]||1,+cmd.split(' ')[2]||1));
        if(cmd==='queue' || cmd==='list') {
            let res = await Music.queue();
            if(!res.isHide) message.channel.send(res);
        }
        if(cmd==='nowplay' || cmd=='np') message.channel.send(Music.nowPlay());
    }
});

//Git Push ???????????? ??????

client.login(token);