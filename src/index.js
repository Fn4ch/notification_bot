require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const chatRoomId = process.env.CHAT_ID;

if (!token || !chatRoomId) {
    console.error('BOT_TOKEN and CHAT_ID must be set in .env');
    process.exit(1);
}

let latestTimeSlots = [];
let dateFetch = 0;
let tenthDayFetch = false;

//GET 9 HOURS FROM NOW
const timeZoneOffsetInHours = 9; // GMT+9 time zone
const offsetInMs = timeZoneOffsetInHours * 60 * 60 * 1000; // Offset in milliseconds

const bot = new TelegramBot(token, { polling: true });

const formatDate = (date) => {
    return date?.toISOString().split('T')[0];
};
bot.sendMessage(chatRoomId, 'Data fetch started.', { disable_notification: true });

const pluralize = (n) => {
    if (n % 10 === 1 && n % 100 !== 11) return '';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'а';
    return 'ов';
};

const fetchData = async () => {
    try {
        let dateToFetch;
        if (tenthDayFetch) {
            dateToFetch = new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000 + offsetInMs);
        } else {
            dateToFetch = new Date(new Date().getTime() + dateFetch * 24 * 60 * 60 * 1000 + offsetInMs);
            if (dateFetch === 10) {
                tenthDayFetch = true
                dateFetch = 0;
            } else {
                dateFetch += 1;
            }
        }

        const formattedDate = formatDate(dateToFetch);

        const response = await axios.get(
            `https://amurbooking.com/oktet/api/v1/booking/time-slots?date=${formattedDate}`
        );

        latestTimeSlots = response?.data;

        const availableSlots = [];

        for (const slot of latestTimeSlots) {
            if (slot.availableToBook) {
                const time = slot.dateBooked.split('T')[1].slice(0, 5);
                const label = slot.freeSlotCount > 0 ? `${time} (${slot.freeSlotCount} св.)` : time;
                availableSlots.push([
                    {
                        text: label,
                        callback_data: JSON.stringify({
                            stage: 1,
                            value: slot.dateBooked,
                        }),
                    },
                ]);
            }
        }

        if (availableSlots.length) {
            const header = `📅 ${formattedDate} — найдено ${availableSlots.length} слот${pluralize(availableSlots.length)}:`;
            bot.sendMessage(chatRoomId, header, {
                disable_notification: true,
                reply_markup: {
                    inline_keyboard: availableSlots,
                },
            });
        }

        tenthDayFetch = !tenthDayFetch;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};
setInterval(fetchData, 4000);