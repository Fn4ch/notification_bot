require('dotenv').config();
const axios = require('axios');
const { Bot: TGBot } = require('grammy');
const { Bot: MaxBot, Keyboard: MaxKeyboard } = require('@maxhub/max-bot-api')



const token = process.env.BOT_TOKEN
let activeChatId = process.env.CHAT_ID

if (!token || !activeChatId) {
    console.error('BOT_TOKEN and CHAT_ID must be set in .env');
    process.exit(1);
}

const maxToken = process.env.MAX_BOT_ACCESS_TOKEN
const maxChatId = process.env.MAX_CHAT_ID

let maxBot = null;
if (maxToken && maxChatId) {
    if (MaxBot) {
        maxBot = new MaxBot(maxToken)
    } else {
        console.error(
            'MAX_BOT_ACCESS_TOKEN/MAX_CHAT_ID заданы, но пакет @maxhub/max-bot-api не установлен ' +
            '(yarn add @maxhub/max-bot-api) — уведомления в MAX отправляться не будут'
        );
    }
}

let latestTimeSlots = [];
let dateFetch = 0;

//GET 9 HOURS FROM NOW
const timeZoneOffsetInHours = 9; // GMT+9 time zone
const offsetInMs = timeZoneOffsetInHours * 60 * 60 * 1000; // Offset in milliseconds

const bot = new TGBot(token)

const toMaxExtra = (options = {}) => {
    const extra = {};

    if ('disable_notification' in options) {
        extra.notify = !options.disable_notification;
    }

    const rows = options.reply_markup?.inline_keyboard;
    if (rows?.length && MaxKeyboard) {
        extra.attachments = [
            MaxKeyboard.inlineKeyboard(
                rows.map((row) => row.map((btn) => MaxKeyboard.button.callback(btn.text, btn.callback_data)))
            ),
        ];
    }

    return extra;
};

const sendToTelegram = async (text, options) => {
    try {
        await bot.api.sendMessage(activeChatId, text, options);
    } catch (err) {
        if (err.parameters?.migrate_to_chat_id) {
            activeChatId = String(err.parameters.migrate_to_chat_id);
            await bot.api.sendMessage(activeChatId, text, options);
        } else {
            throw err;
        }
    }
};

const sendToMax = async (text, options) => {
    if (!maxBot) return;
    try {
        await maxBot.api.sendMessageToChat(maxChatId, text, toMaxExtra(options));
    } catch (err) {
        console.error('Error sending to MAX:', err);
    }
};

const sendMsg = async (text, options = {}) => {
    try {
        await sendToTelegram(text, options);
    } catch (err) {
        console.error('Error sending to Telegram:', err);
    }
    await sendToMax(text, options);
};

const formatDate = (date) => {
    return date?.toISOString().split('T')[0];
};

const pluralize = (n) => {
    if (n % 10 === 1 && n % 100 !== 11) return '';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'а';
    return 'ов';
};

const fetchData = async () => {
    try {
        let dateToFetch;
            dateToFetch = new Date(new Date().getTime() + dateFetch * 24 * 60 * 60 * 1000 + offsetInMs);
            dateFetch = dateFetch >= 4 ? 0 : dateFetch + 1;

        const formattedDate = formatDate(dateToFetch);

        const response = await axios.get(
            `https://amurbooking.com/oktet/api/v1/booking/time-slots?date=${formattedDate}`
        );

        latestTimeSlots = response?.data;

        const buttons = [];

        for (const slot of latestTimeSlots) {
            if (slot.availableToBook) {
                const time = slot.dateBooked.split('T')[1].slice(0, 5);
                const label = slot.freeSlotCount > 0 ? `${time} (${slot.freeSlotCount} св.)` : time;
                buttons.push({
                    text: label,
                    callback_data: JSON.stringify({
                        stage: 1,
                        value: slot.dateBooked,
                    }),
                });
            }
        }

        if (buttons.length > 20) {
            const ranges = [];
            let rangeStart = null;
            let rangeEnd = null;

            for (const slot of latestTimeSlots) {
                if (slot.availableToBook) {
                    const time = slot.dateBooked.split('T')[1].slice(0, 5);
                    if (rangeStart === null) rangeStart = time;
                    rangeEnd = time;
                } else if (rangeStart !== null) {
                    ranges.push(rangeStart === rangeEnd ? rangeStart : `${rangeStart} — ${rangeEnd}`);
                    rangeStart = null;
                    rangeEnd = null;
                }
            }
            if (rangeStart !== null) {
                ranges.push(rangeStart === rangeEnd ? rangeStart : `${rangeStart} — ${rangeEnd}`);
            }

            const header = `📅 ${formattedDate} — найдено ${buttons.length} слот${pluralize(buttons.length)}:\n${ranges.join('\n')}`;
            await sendMsg(header, { disable_notification: true });
        } else if (buttons.length) {
            const COLS = 4;
            const keyboard = [];
            for (let i = 0; i < buttons.length; i += COLS) {
                keyboard.push(buttons.slice(i, i + COLS));
            }

            const header = `📅 ${formattedDate} — найдено ${buttons.length} слот${pluralize(buttons.length)}:`;
            await sendMsg(header, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: keyboard,
                },
            });
        }

    } catch (error) {
        console.error('Error fetching data:', error);
    }
};
setInterval(fetchData, (Math.floor(Math.random() * 7) + 5) * 1000);