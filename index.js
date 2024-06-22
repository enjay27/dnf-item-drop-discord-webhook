const {EmbedBuilder, WebhookClient} = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();
const adventurers = require('./adventurers.json');

const webhookClient = new WebhookClient({id: process.env.DISCORD_WEBHOOK_ID, token: process.env.DISCORD_WEBHOOK_TOKEN});

const itemAcquireInfoList = [
    {
        "code": 513,
        "name": "🗝기록실"
    },
    {
        "code": 505,
        "name": "📚서고"
    },
    {
        "code": 504,
        "name": "🌟별무리"
    }
]

const start = async () => {
    for (const adventurer of adventurers) {
        const characters = await t(adventurer.name);
        for (const character of characters) {
            for (const itemAcquireInfo of itemAcquireInfoList) {
                const itemAcquire = await getItemAcquire(itemAcquireInfo, character.server, character.id);
                if (itemAcquire.length !== 0)
                    console.log(itemAcquire);
                for (const item of itemAcquire) {
                    await sendDiscordMessage({
                        "where": itemAcquireInfo.name,
                        "when": itemAcquire.date,
                        "who": character.name,
                        "what": itemAcquire.data.itemName
                    })
                }
            }
        }
    }
}

const t = async (adventurer) => {
    const response = await axios.post(`https://dundam.xyz/dat/searchData.jsp?name=${adventurer}&server=adven`, {}, {
        timeout: 60000
    })
    return response.data.characters.filter(r => r.fame > 51693).map(r => {
        return {
            "name": r.name,
            "id": r.key,
            "server": r.server
        }
    });
}

const sendDiscordMessage = async (request) => {
    const embed = new EmbedBuilder()
        .setTitle('누군가가 태초를 먹었음')
        .setTimestamp(Date.parse(request.when))
        .setDescription(`${request.who} - ${request.where} 에서 먹었음`)
        .setColor(0x00FFFF);

    webhookClient.send({
        embeds: [embed],
    });
}

const getItemAcquire = async (itemAcquireInfo, server, characterId) => {
    const archiveResponse = await axios.get(`https://api.neople.co.kr/df/servers/${server}/characters/${characterId}/timeline`, {
        params: {
            limit: 100,
            code: itemAcquireInfo.code,
            apikey: 'UT3yzmFGRFKctbwp0g21lKt8IJbHeloK',
            startDate: new Date(Date.now() - process.env.INTERVAL_MIN * 60 * 1000),
            endDate: new Date()
        },
        timeout: 60000
    });
    return archiveResponse.data.timeline.rows.filter(r => r.data.itemRarity === '태초');
}

let task = cron.schedule(`*/${process.env.INTERVAL_MIN} * * * *`, () => {
    console.log(`start task :: ${new Date()}`)
    start();
});

task.start();