module.exports = {
    apps: [
        {
            name: 'notification-bot',
            script: 'src/index.js',
            restart_delay: 3000,
            max_restarts: 50,
            watch: false,
        },
    ],
};
