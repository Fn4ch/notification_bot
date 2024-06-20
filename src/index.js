const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

let latestTimeSlots = [];
const chatRoomId = '-1002205789353';
const token = '6953920700:AAEsu7vPOdurQ7m3kINbgya4ehG1m1tq6to';
let dateFetch = 0;
let tenthDayFetch = false;

//GET 9 HOURS FROM NOW
const today = new Date(); // Current date and time in the local time zone
const timeZoneOffsetInHours = 9; // GMT+9 time zone
const offsetInMs = timeZoneOffsetInHours * 60 * 60 * 1000; // Offset in milliseconds

const bot = new TelegramBot(token, { polling: true });

const formatDate = (date) => {
    return date?.toISOString().split('T')[0];
};
bot.sendMessage(chatRoomId, 'Data fetch started.');

const fetchData = async () => {
    try {
        let dateToFetch;
        if (tenthDayFetch) {
            dateToFetch = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000 + offsetInMs);
        } else {
            dateToFetch = new Date(today.getTime() + dateFetch * 24 * 60 * 60 * 1000 + offsetInMs);
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

        for (let index = 0; index < latestTimeSlots.length; index++) {
            if (latestTimeSlots[index].availableToBook) {
                availableSlots.push([
                    {
                        text: latestTimeSlots[index].dateBooked,
                        callback_data: JSON.stringify({
                            stage: 1,
                            value: latestTimeSlots[index].dateBooked,
                        }),
                    },
                ]);
            }
        }

        if (availableSlots.length) {
            bot.sendMessage(chatRoomId, `${formattedDate}:`, {
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