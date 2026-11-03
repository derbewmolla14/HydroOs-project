const write = (level, message, metadata = {}) => {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...metadata
    };
    const output = JSON.stringify(entry);
    if (level === 'error') {
        console.error(output);
    } else {
        console.log(output);
    }
};

export const logger = Object.freeze({
    info: (message, metadata) => write('info', message, metadata),
    warn: (message, metadata) => write('warn', message, metadata),
    error: (message, metadata) => write('error', message, metadata)
});
