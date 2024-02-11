const socket = require('socket.io');
const mqtt = require('mqtt')

//global variable for acc_data
var acc_data = {}
var single_data = {}
var nodes_log_raw = {};
var device_properties = {}


class Mqtt_handler{
    constructor(server,db) {
        this.db = db;
        //ws setup
        this.io = socket(server);
        //ws functions
        this.io.on('connection',(socket)=>{
            console.log('got connection');
        })

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
            this.db.device_model.get_devices().then((results)=>{
                this.update_device_properties();
                results.forEach(device => {
                    this.client.subscribe([device.topic], () => {
                        nodes_log_raw[device.topic]=device.log_raw;
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
            // console.log("===============================");
            // console.log(payload);
            // console.log("===============================");
            try {
                let time_data_in = (new Date().getTime() / 1000);
                let obj={};
                payload = JSON.parse(payload);
                console.log(payload['sensor_type'])
                if(payload['sensor_type']=='accelerometer'){
                    console.log(payload['battery_voltage'])
                    let data_len = payload.x_values.length;
                    obj['node']=unparsed_topic;
                    obj['timestamp']=Math.floor(time_data_in);
                    obj['meassurement_data']=payload;
        
                    obj['time_data']=[];
                    for (let i=0;i<data_len;i++){
                        let time_to_push = time_data_in-((data_len-i)*0.005); //for 5ms sampling delay (200Hz)
                        obj.time_data.push(time_to_push);
                    }
                    this.update_acc_data(unparsed_topic,payload,obj.time_data,obj)
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
                    this.update_single_data(unparsed_topic,data,timestamp)
                    this.db.logger_model.log_single_data(data).then(()=>{
                        console.log("data logged to local DB");    
                    });
                }
                
            } catch (error) {
                console.log(error);
            }
        })
    }

    update_device_properties = async ()=>{
        this.db.device_model.get_devices()
        .then((results)=>{
            device_properties = results;
        });
    }


    update_topic_subscribe = (topics) => {
        try {
            console.log(topics);
            this.client.unsubscribe(topics.old, (unsubscribeErr) => {
              if (!unsubscribeErr) {
                console.log(`Unsubscribed from topic: ${topics.old}`);
                this.client.subscribe([topics.new], () => {
                    this.update_device_properties();
                    console.log(`Subscribe to topic '${topics.new}'`);
                });
                this.db.device_model.get_devices().then((results)=>{
                    results.forEach(device => {
                        this.client.subscribe([device.topic], () => {
                            nodes_log_raw[device.topic]=device.log_raw;
                            if(device.log_raw==1){
                                console.log(`raw data log enabled for ${device.name}`);
                            }else{
                                console.log(`raw data log disabled for ${device.name}`);
                            }
                        })
                    });
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

    update_acc_data_stream = async (payload)=>{
        new Promise(()=>{
            this.io.local.emit("accelerometer_stream",payload);
        });
        // this.io.local.emit("accelerometer_stream",payload);
    }

    log_acc_data = async (data_to_log) =>{
        let topic = data_to_log.node;
        let device_to_log = {};
        device_properties.forEach(device=>{
            if(device.topic==topic){
                device_to_log=device;
            }
        })
        data_to_log['node']=device_to_log.id
        // console.log(device_to_log.topic,device_to_log.id);
        this.db.logger_model.log_data(data_to_log);
    }

    update_acc_data = async (topic,payload,time_data,data_to_log)=>{
        if(nodes_log_raw[topic]==1){
            this.log_acc_data(data_to_log);
        }
        acc_data[topic]={};
        acc_data[topic] = payload;
        acc_data[topic].timestamp = time_data;
        payload = {
            topic:topic,
            data:acc_data[topic]
        }
        this.update_acc_data_stream(payload);
        this.io.local.emit(topic,acc_data[topic]);
    }
    
    update_single_data = async (topic,sensor_data,timestamp)=>{
        single_data[topic]={};
        single_data[topic] = sensor_data;
        this.io.local.emit(topic,single_data[topic]);
    }
}





module.exports = Mqtt_handler;