const { json } = require('express');
const db = require('./model/database');

const mqtt = require('mqtt')

const host = 'localhost'
const port = '1883'
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`

const connectUrl = `mqtt://${host}:${port}`

const client = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
})

const topics = ['/shms/node_1/accelerometer',
                '/shms/node_2/accelerometer',
                '/shms/node_3/accelerometer',
                '/shms/node_4/accelerometer',
                '/shms/node_5/accelerometer',
                '/shms/node_6/accelerometer',
                '/shms/node_7/accelerometer',
                '/shms/node_8/accelerometer'
                ]

client.on('connect', () => {
  console.log('Connected')
  topics.forEach(topic => {
    client.subscribe([topic], () => {
        console.log(`Subscribe to topic '${topic}'`);
        client.publish(topic, ' ', { qos: 0, retain: false });
    })
  });
})

client.on('message', (topic, payload) => {
    topic = topic.replace('/shms/','');
    topic = topic.replace('/accelerometer','');
    payload = payload.toString();
    try {
        time_data_in = (new Date().getTime() / 1000);
        obj={};
        payload = JSON.parse(payload);
        data_len = payload.x_values.length;
        obj['node']=topic;
        obj['timestamp']=Math.floor(time_data_in);
        obj['meassurement_data']=payload;

        obj['time_data']=[];
        for (let i=0;i<data_len;i++){
            time_to_push = time_data_in-((data_len-i)*0.005); //for 5ms sampling delay (200Hz)
            obj.time_data.push(time_to_push);
        }
        db.log_data(obj);
    } catch (error) {
        console.log(error);
    }
})
