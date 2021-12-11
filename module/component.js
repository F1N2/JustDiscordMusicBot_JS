const { MessageActionRow, MessageButton } = require('discord.js');

module.exports = {
    button : data => {
        /*
            * : this paramater is not required.
            ** : this paramater is only one paramater required.
            **data.id (String) = Custom ID
            data.title (String) = Button title
            data.style (String) = Button Style [PRIMARY,SECONDARY,SUCCESS,DANGER,LINK]
            *data.disabled (Boolean) = Set Button Enable/Disable
            *data.emoji (Boolean) = Set Button Emoji
            **data.url (Boolean) = Set Button URL
        */
        let row = new MessageActionRow();
        for(let i=0;i<data.length;i++) {
            let btn = new MessageButton()
                .setLabel(data[i].title)
                .setStyle(data[i].style);
            if(data[i].disabled) btn.setDisabled(data[i].disabled);
            if(data[i].emoji) btn.setEmoji(data[i].emoji);
            if(data[i].url) btn.setURL(data[i].url);
            else if(data[i].id) btn.setCustomId(data[i].id);
            row.addComponents(btn);
        }
        return row;
    }
}