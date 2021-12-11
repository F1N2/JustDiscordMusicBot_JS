const { MessageEmbed } = require('discord.js');

module.exports = {
    default : data => {
        /*
            * : this paramater is not required.
            data.title (String) : Embed title
            data.desc (String) : Embed description
            data.color (String) : Embed color
            *data.url (String) : Embed URL
            *data.image (String) : Embed image
            *data.thumbnail (String) : Embed thumbnail
            *data.footer (Array) : [ Text , URL ]
            *data.timestamp (Boolean) : Show Timestamp
        */
        if(!data.title || !data.desc || !data.color) return console.error('MessageEmbed Error','Required parameter is not defined.');
        let embed = new MessageEmbed()
            .setColor(data.color)
            .setTitle(data.title)
            .setDescription(data.desc);
        if(data.url) embed.setURL(data.url);
        if(data.image) embed.setImage(data.image);
        if(data.thumbnail) embed.setThumbnail(data.thumbnail);
        if(data.timestamp) embed.setTimestamp();
        if(data.footer) embed.setFooter(data.footer[0],data.footer[1]);
        return embed;
    },
    field : data => {
        /*
            * : this paramater is not required.
            data.title (String) : Embed title
            data.field (Array) : [{name:'Title',value:'desc',inline:true|false}]
            *data.desc (String) : Embed description
            data.color (String) : Embed color
            *data.url (String) : Embed URL
            *data.image (String) : Embed image
            *data.thumbnail (String) : Embed thumbnail
            *data.footer (Array) : [ Text , URL ]
            *data.timestamp (Boolean) : Show Timestamp
        */
        if(!data.title || !data.fields || !data.color) return console.error('MessageEmbed Error','Required parameter is not defined.');
        let embed = new MessageEmbed()
            .setColor(data.color)
            .setTitle(data.title);
        for(let i=0;i<data.fields.length;i++) embed.addField(data.fields[i].name,data.fields[i].value,data.fields[i].inline);
        if(data.desc) embed.setDescription(data.desc)
        if(data.url) embed.setURL(data.url)
        if(data.image) embed.setImage(data.image)
        if(data.thumbnail) embed.setThumbnail(data.thumbnail)
        if(data.timestamp) embed.setTimestamp()
        if(data.footer) embed.setFooter(data.footer[0],data.footer[1]);
        return embed;
    }
}