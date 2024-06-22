const {EmbedBuilder, WebhookClient} = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');
const waait = require('waait');
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

const itemMap = new Map();

const start = async () => {
    for (const adventurer of adventurers) {
        const characters = await getAdventurers(adventurer.name);
        await waait(500);
        for (const character of characters) {
            for (const itemAcquireInfo of itemAcquireInfoList) {
                const itemAcquire = await getItemAcquire(itemAcquireInfo, character.server, character.id);
                if (itemAcquire.length !== 0)
                    console.log(itemAcquire);
                for (const item of itemAcquire) {
                    let key = item.date + item.data.itemName;
                    if (!itemMap.has(key)) {
                        let request = {
                            "where": itemAcquireInfo.name,
                            "when": item.date,
                            "who": character.name,
                            "what": item.data.itemName,
                            "channelName": item.data.channelName,
                            "channelNo": item.data.channelNo
                        };
                        await sendDiscordMessage(request)
                        itemMap.set(key, request);
                        setTimeout(() => {
                            itemMap.delete(key);
                        }, 1000 * 60 * 60 * 3);
                    }
                }
            }
        }
    }
}

const getAdventurers = async (adventurer) => {
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
    let description = `\n${request.who} - ${request.where} 에서 **${request.what}** 먹었음\n`
    if (request.channelName && request.channelNo) {
        description += `${request.channelName} ${request.channelNo}채널`
    }
    const embed = new EmbedBuilder()
        .setTitle(process.env.MESSAGE_TITLE)
        .setTimestamp(Date.parse(request.when))
        .setDescription(description)
        .setColor(0xFFFF00);

    webhookClient.send({
        embeds: [embed],
    });
}

const getItemAcquire = async (itemAcquireInfo, server, characterId) => {
    const archiveResponse = await axios.get(`https://api.neople.co.kr/df/servers/${server}/characters/${characterId}/timeline`, {
        params: {
            limit: 100,
            code: itemAcquireInfo.code,
            apikey: process.env.DNF_API_KEY,
            startDate: new Date(Date.now() - 3 * 60 * 60 * 1000),
            endDate: new Date()
        },
        timeout: 60000
    });
    await waait(500);
    return archiveResponse.data.timeline.rows.filter(r => r.data.itemRarity === '태초');
}

let task = cron.schedule(`*/${process.env.INTERVAL_MIN} * * * *`, () => {
    console.log(`start task :: ${new Date()}`)
    start();
});

task.start();