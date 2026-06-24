require('dotenv').config();
const axios = require('axios');
const { Bot } = require('grammy');

const token = process.env.BOT_TOKEN;
const chatRoomId = process.env.CHAT_ID;

if (!token || !chatRoomId) {
    console.error('BOT_TOKEN and CHAT_ID must be set in .env');
    process.exit(1);
}

let latestTimeSlots = [];
let dateFetch = 0;
let fetchCount = 0;
const TENTH_DAY_EVERY = 10; // запрос на 10й день раз в N обычных запросов

//GET 9 HOURS FROM NOW
const timeZoneOffsetInHours = 9; // GMT+9 time zone
const offsetInMs = timeZoneOffsetInHours * 60 * 60 * 1000; // Offset in milliseconds

const bot = new Bot(token);

const formatDate = (date) => {
    return date?.toISOString().split('T')[0];
};
bot.api.sendMessage(chatRoomId, 'Data fetch started.', { disable_notification: true });

const pluralize = (n) => {
    if (n % 10 === 1 && n % 100 !== 11) return '';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'а';
    return 'ов';
};

const fetchData = async () => {
    try {
        fetchCount++;
        let dateToFetch;
        if (fetchCount % TENTH_DAY_EVERY === 0) {
            dateToFetch = new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000 + offsetInMs);
        } else {
            dateToFetch = new Date(new Date().getTime() + dateFetch * 24 * 60 * 60 * 1000 + offsetInMs);
            dateFetch = dateFetch >= 9 ? 0 : dateFetch + 1;
        }

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

        if (buttons.length) {
            const COLS = 4;
            const keyboard = [];
            for (let i = 0; i < buttons.length; i += COLS) {
                keyboard.push(buttons.slice(i, i + COLS));
            }

            const header = `📅 ${formattedDate} — найдено ${buttons.length} слот${pluralize(buttons.length)}:`;
            bot.api.sendMessage(chatRoomId, header, {
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
setInterval(fetchData, 5000);