const mqtt = require('mqtt')
require('dotenv').config();
app_port = process.env.PORT
db_host = process.env.DB_HOST
db_user = process.env.DB_USER
db_pwd = process.env.DB_PWD
db_name = process.env.DB_NAME
const Database = require('../model/database');
const db = new Database(db_host, db_user, db_pwd, db_name);

class Mqtt_handler{
    constructor() {
        this.host = 'localhost';
        this.port = '1883';
        this.clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
        this.connectUrl = `mqtt://${this.host}:${this.port}`;
        this.client = mqtt.connect(this.connectUrl, {
            clientId:this.clientId,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
        })

        this.client.on('connect', () => {
            db.get_devices().then((results)=>{
                results.forEach(device => {
                    this.client.subscribe([device.topic], () => {
                        console.log(`Subscribe to topic '${device.topic}'`);
                        this.client.publish(device.topic, ' ', { qos: 0, retain: false });
                    })
                });
            });
        })

        this.client.on('message', async (topic, payload) => {
            let unparsed_topic = topic;
            topic = topic.replace('/shms/','');
            topic = topic.replace('/accelerometer','');
            payload = payload.toString();
            // console.log(payload);
            try {
                let time_data_in = (new Date().getTime() / 1000);
                let obj={};
                payload = JSON.parse(payload);
                if(payload['sensor_type']=='accelerometer'){
                    data_len = payload.x_values.length;
                    obj['node']=unparsed_topic;
                    obj['timestamp']=Math.floor(time_data_in);
                    obj['meassurement_data']=payload;
        
                    obj['time_data']=[];
                    for (let i=0;i<data_len;i++){
                        let time_to_push = time_data_in-((data_len-i)*0.005); //for 5ms sampling delay (200Hz)
                        obj.time_data.push(time_to_push);
                    }
                    db.log_data(obj).then(()=>{
                        console.log("data logged to local DB");    
                    });
                    // sqlite.log_acc_data(obj)
                    // .then(()=>{
                    //     console.log("data logged to local DB");    
                    // });
                    // update_acc_data(unparsed_topic,payload,obj.time_data)
                }
        
                if(payload['sensor_type']=='single_data'){
                    let sensor_data = payload.value;
                    let timestamp = (new Date().getTime() / 1000);
                    let data = {
                        value:payload.value,
                        timestamp:timestamp,
                        label:payload.label,
                        topic:unparsed_topic
                    }
                    console.log(data);
                    // update_single_data(unparsed_topic,data,timestamp)
                    db.log_single_data(data).then(()=>{
                        console.log("data logged to local DB");    
                    });
                }
                
            } catch (error) {
                console.log(error);
            }
        })
    }

    update_topic_subscribe = (topics) => {
        try {
            console.log(topics);
            this.client.unsubscribe(topics.old, (unsubscribeErr) => {
              if (!unsubscribeErr) {
                console.log(`Unsubscribed from topic: ${topics.old}`);
                this.client.subscribe([topics.new], () => {
                    console.log(`Subscribe to topic '${topics.new}'`);
                });
              } else {
                console.error(`Error unsubscribing from topic`);
              }
            }); 
        } catch (error) {
            console.log(error);
        }
    }

    add_topic_subscribe = async(topic) => {
        try {
            this.client.subscribe([topic], () => {
                console.log(`Subscribe to topic '${topic}'`);
            });
        } catch (error) {
            console.log(error);
        }
    }

    remove_topic_subscribe = async(topic) => {
        try {
            this.client.unsubscribe(topic, (unsubscribeErr) => {
                if (!unsubscribeErr) {
                  console.log(`Unsubscribed from topic: ${topic}`);
                } else {
                  console.error(`Error unsubscribing from topic`);
                }
            }); 
        } catch (error) {
            console.log(error);
        }
    }
}

module.exports = Mqtt_handler;