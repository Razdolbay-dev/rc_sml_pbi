module.exports = {
    apps: [{
        name: 'remote-control',
        script: 'backend/server.js',
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '200M',
        env: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_file: './logs/combined.log',
        time: true
    }]
};