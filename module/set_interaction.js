const wait = require('util').promisify(setTimeout);
const request = require('request-promise');
const commands = require('../commands.json');

module.exports = async (token,client_id) => {
    try {

		let ms = +new Date();
		let header = {
			'Authorization': 'Bot ' + token,
			'Content-Type': 'application/json'
		}

		console.log(`Started getting application (/) commands. (Delay : ${+new Date()-ms} ms)`);

		//GET Slash Commands Info & DELETE Legacy Shash Command Info
		let legacy = JSON.parse(await request({
			method:'GET',
			uri:`https://discord.com/api/v8/applications/${client_id}/commands`,
			headers: header
		}));
		
        console.log(`Started deleting legacy application (/) commands. (Delay : ${+new Date()-ms} ms)`);

		for(let i=0;i<legacy.length;i++) if(!commands.find(e=>e.name===legacy[i].name)) {
			await request({
				method:'DELETE',
				uri:`https://discord.com/api/v8/applications/${client_id}/commands/${legacy[i].id}`,
				headers: header
			});
			await wait(10000);
		}

        console.log(`Started adding application (/) commands. (Delay : ${+new Date()-ms} ms)`);

		//PUT Slash Commands Info
        for(let i=0;i<commands.length;i++) {
			await request({
				method:'POST',
				uri:`https://discord.com/api/v8/applications/${client_id}/commands`,
				body:JSON.stringify(commands[i]),
				headers: header
        	});
			await wait(10000);
		}

		console.log(`Successfully added application (/) commands. (Delay : ${+new Date()-ms} ms)`);

    } catch(e) {
        console.error(e);
    }
}