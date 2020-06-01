# PubSubConsumerTest
Example Pub/Sub Consumer for researching grpc failures

## Usage : 
*node consumer.js --projectId myProjectId --subscriptions subscription1,subscription2 --credentials my-credential-file.json*

--subscriptions option only requires the subscription name (not path).  So, *--projectId myProjectId --subscriptions mySubscription* will result in a subscription to projects/myProjectId/subscriptions/mySubscription

The --credentials option can be excluded if the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly.