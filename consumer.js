const {PubSub} = require('@google-cloud/pubsub');
const grpc = require('grpc');

const argv = require('yargs')
    .option('projectId', {
        alias: 'p',
    })
    .option('subscriptions', {
        alias: 's',
    })
    .option('credentials', {
        alias: 'c',
    })
    .argv;

// Can't do anything without a projectId
if (!argv.projectId) {
    console.error('--projectId not specified.');
    process.exit(-1);
}

// Source credentials file if specified
if (argv.credentials) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = argv.credentials;
}

const projectId = argv.projectId;

// Create the client
const pubSubClient = new PubSub({
    projectId,
    grpc, // Override grpc-js with grpc
});

// These can be used as default subscriptions to avoid a long --subscriptions option.
const subscriptionStrings = [
];

// If argv.subscriptions is specified, split on comma and push into array
if (argv.subscriptions) {
    argv.subscriptions.split(',').forEach((sub) => {
        subscriptionStrings.push(`projects/${projectId}/subscriptions/${sub}`);
    });
}

// Credentials check
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !argv.credentials) {
    console.error('--credentials not specified and no GOOGLE_APPLICATION_CREDENTIALS env var set.  Can not continue without credentials!  Exiting...');
    process.exit(-1);
}

// Subscription check
if (subscriptionStrings.length === 0 && !argv.subscriptions) {
    console.error('No subscriptions specified, nothing to subscribe to!  You must specify --subscriptions or hardcode them in subscriptionStrings.  Exiting...');
}


console.info(`ProjectId : ${projectId}`);
console.info(`Credentials file : ${argv.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
console.info(`Subscriptions : ${subscriptionStrings.join(', ')}`);
console.info('\tStarting consumer(s)...');

function configureEventHandlers(subscriber, id, handler) {
    console.info(`\tConfiguring event handlers for subscription ${id}`);

    // closeHandler is nested for scoping purposes
    const closeHandler = (close) => {
        console.info(`Closed subscriber : ${JSON.stringify(close)}`);
    }

    // errorHandler is nested for scoping purposes.
    const errorHandler = (err) => {
        console.error(`Error generated from PubSubSubscriber, reconfiguring subscriber.  Error : 
                ${JSON.stringify(err)}`);
        subscriber.removeAllListeners('message');
        subscriber.removeListener('error', errorHandler);
        subscriber.removeListener('close', closeHandler);
        configureEventHandlers(subscriber, id, handler);
    };

    // Configure events
    subscriber.on('message', handler.bind(handler));
    subscriber.on('close', closeHandler);
    subscriber.on('error', errorHandler);

    return subscriber;
}

// Create an event handler to handle messages
let messageCount = 0;
const messageHandler = (message) => {
    console.log(`${new Date()} : Received message ${message.id}:`);
    console.log(`\tData: ${message.data}`);
    console.log(`\tAttributes: ${JSON.stringify(message.attributes)}`);
    messageCount += 1;

    // Ack the message
    message.ack();
};

const subscriptions = [];
subscriptionStrings.forEach((sub) => {
    const newSub = pubSubClient.subscription(sub);
    configureEventHandlers(newSub, sub, messageHandler);
    subscriptions.push(newSub);
});