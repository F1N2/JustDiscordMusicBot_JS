const { MessageAttachment } = require('discord.js');
const { color } = require('../setting/config.json');
const Embed = require('./embed');
const File = require('./file');

module.exports = {
    eval : code => {
        try {
            let res = eval(code);
            let type = ({}).toString.call(res).match(/\s([a-zA-Z]+)/)[1].toString();
            return {embeds:[
                Embed.desc({
                    color:color,
                    title:'Eval - ***success***',
                    fields:[
                        {name:'Result',value:`\`\`\`js\n${res}\`\`\``},
                        {name:'Result Type',value:`\`\`\`js\n${type}\`\`\``}
                    ]
                })
            ],ephemeral:true};
        } catch(e) {
            return {embeds:[
                Embed.desc({
                    color:'#ff0000',
                    title:'Eval - ***Error***',
                    fields:[{name:'Error',value:`\`\`\`js\n${e}\`\`\``}]
                })
            ],ephemeral:true};
        }
    },
    error : (e,hide) => {
        console.log(e);
        return {embeds:[
            Embed.default({
            color:'#ff0000',
            title:'오류 발생',
            desc:`오류가 발생했어요...\n\`\`\`js\n${e}\`\`\``,
            timestamp:true
        })],ephemeral:hide?true:false};
    },
    textAttachment : (text,name = 'message.txt') => {
        File.save('./tmp.txt',text);
        let attachment = new MessageAttachment(File.read('./tmp.txt'),name);
        File.remove('./tmp.txt');
        return attachment;
    }
}