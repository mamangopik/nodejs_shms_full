const socket = require('socket.io');
const mqtt = require('mqtt')

const libsocket = require('ws');
const LZUTF8 = require('lzutf8');

//global variable for acc_data
var acc_data = {}
var fft_data = {}
var log_info = {}
var acc_to_send = {}
var single_data = {}
var single_data_cf = {}
var nodes_log_raw = {};
var device_properties = {}
var last_got_ws = 0;


class Mqtt_handler {
    constructor(server, db, broker) {
        this.db = db;
        this.broker = broker;
        console.log(this.broker);
        //ws setup
        this.io = socket(server);
        //ws functions
        this.io.on('connection', (socket) => {
            console.log('got connection');
            socket.on('callibration_factor', (message) => {
                console.log('Message received from HTML:', message);
                let payload = JSON.parse(message);
                single_data_cf[payload.topic] = parseFloat(payload.cf_value);
            });
        })
        // this.wss = new libsocket.WebSocket('ws://localhost:7778');

        // const update_fft_data = async (topic, payload) => {

        //     fft_data[topic] = {};
        //     fft_data[topic] = payload;
        //     this.io.local.emit(topic, fft_data[topic]);

        //     payload = {
        //         topic: topic,
        //         data: acc_data[topic]
        //     }
        // }
        // this.wss.on('message', (data) => {
        //     // console.log(data.toString());
        //     data = data.toString();
        //     data = JSON.parse(data)
        //     update_fft_data(`fft_${data.cid}`, data)
        // });

        this.wss = null;
        const reconnectInterval = 5000; // Reconnect every 5 seconds

        // Function to initialize WebSocket
        const initializeWebSocket = () => {
            try {

                this.wss = new libsocket.WebSocket('ws://localhost:7778');

                this.wss.on('open', function open() {
                    console.log("ws connected");
                });

                const update_fft_data = async (topic, payload) => {
                    fft_data[topic] = payload;
                    this.io.local.emit(topic, fft_data[topic]);

                    payload = {
                        topic: topic,
                        data: acc_data[topic]
                    };
                };

                this.wss.on('message', (data) => {
                    data = data.toString();
                    data = JSON.parse(data);
                    update_fft_data(`fft_${data.cid}`, data);
                });

                this.wss.on('close', function close() {
                    console.log("ws connection closed, attempting to reconnect...");
                    setTimeout(initializeWebSocket, reconnectInterval);
                });

                this.wss.on('error', function error(err) {
                    console.log("ws connection error:", err);
                    try {
                        this.wss.close(); // Close the connection to trigger the reconnect logic
                    } catch (error) {

                    }
                });
            } catch (error) {

            }
        };

        // Start WebSocket connection
        initializeWebSocket();



        this.host = this.broker;
        this.port = '1883';
        this.clientId = `mqtt_${Math.random().toString(16).slice(3)}`;
        this.connectUrl = `mqtt://${this.host}:${this.port}`;
        this.client = mqtt.connect(this.connectUrl, {
            clientId: this.clientId,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
        })

        this.client.on('connect', () => {
            this.db.device_model.get_devices().then((results) => {
                this.update_device_properties();
                results.forEach(device => {
                    this.client.subscribe([device.topic], () => {
                        nodes_log_raw[device.topic] = device.log_raw;
                        console.log(`Subscribe to topic '${device.topic}'`);
                        // this.client.publish(device.topic, ' ', { qos: 0, retain: false });
                        //check the table is exist or not 
                        console.log(device.id);
                        this.db.device_model.device_has_table(device.id).then((clbk) => {
                            if (clbk == 1) {
                                console.log(`device ${device.id} sudah memiliki tabel`);
                            } else {
                                console.log(`device ${device.id} tidak memiliki tabel`);
                                this.db.device_model.create_device_table(device.id);
                            }
                        })
                    })
                });
            });
        })

        this.client.on('message', async (topic, payload) => {
            let unparsed_topic = topic;
            topic = topic.replace('/shms/', '');
            topic = topic.replace('/accelerometer', '');
            payload = payload.toString();
            // console.log("===============================");
            // console.log(payload);
            // console.log("===============================");
            try {
                let time_data_in = (new Date().getTime() / 1000);
                let obj = {};
                payload = JSON.parse(payload);
                console.log(payload['sensor_type'])
                if (payload['sensor_type'] == 'accelerometer') {
                    console.log(payload['battery_voltage'])
                    let data_len = payload.x_values.length;
                    obj['node'] = unparsed_topic;
                    obj['timestamp'] = Math.floor(time_data_in);
                    obj['meassurement_data'] = payload;

                    obj['time_data'] = [];
                    for (let i = 0; i < data_len; i++) {
                        let time_to_push = time_data_in - ((data_len - i) * (1 / payload.sampling_frequency)); //for 5ms sampling delay (200Hz)
                        obj.time_data.push(time_to_push);
                    }
                    new Promise(async () => {
                        this.update_fft_feeder_data(unparsed_topic, payload)
                        this.request_fft(unparsed_topic, payload);
                    });
                    new Promise(() => {
                        this.update_acc_data(unparsed_topic, payload, obj.time_data, obj)
                    });
                    //this.update_acc_data(unparsed_topic, payload, obj.time_data, obj)
                }

                if (payload['sensor_type'] == 'single_data') {
                    console.log(unparsed_topic, single_data_cf[unparsed_topic] == undefined)
                    console.log(single_data_cf);
                    console.log(single_data_cf[unparsed_topic])
                    if (single_data_cf[unparsed_topic] == undefined) {
                        let sensor_data = payload.values;
                        let kf_sensor_data = payload.kf_values;
                        let timestamp = (new Date().getTime() / 1000);
                        let data = {
                            values: {
                                raw: sensor_data,
                                filtered: kf_sensor_data
                            },
                            timestamp: timestamp,
                            label: payload.label,
                            topic: unparsed_topic,
                            v_vbatt: payload['battery_voltage'],
                            RSSI: payload['signal_strength']
                        }
                        this.update_single_data(unparsed_topic, data, timestamp)
                        let device_to_log = {}
                        let data_to_log = {}
                        device_properties.forEach(device => {
                            if (device.topic == unparsed_topic) {
                                device_to_log = device;
                            }
                        })

                        if (device_to_log.log_raw == 1) {
                            data_to_log['node'] = device_to_log.id
                            data_to_log['meassurement_data'] = data;
                            this.db.device_model.device_has_table(device_to_log.id).then((clbk) => {
                                if (clbk == 1) {
                                    this.db.logger_model.log_single_data(device_to_log.id, data_to_log);
                                } else {
                                    this.db.device_model.create_device_table(device_to_log.id);
                                }
                            })
                        }
                    } else {
                        console.log('ada cf')
                        let raw_buffer = [];
                        let filtered_buffer = [];
                        let sensor_data = payload.values;
                        let kf_sensor_data = payload.kf_values;
                        let timestamp = (new Date().getTime() / 1000);

                        sensor_data.forEach(raw => {
                            raw_buffer.push(parseFloat(raw) - parseFloat(single_data_cf[unparsed_topic]));
                        });
                        kf_sensor_data.forEach(filtered => {
                            filtered_buffer.push(parseFloat(filtered) - parseFloat(single_data_cf[unparsed_topic]));
                        });

                        let data = {
                            values: {
                                raw: raw_buffer,
                                filtered: filtered_buffer
                            },
                            timestamp: timestamp,
                            label: payload.label,
                            topic: unparsed_topic,
                            v_vbatt: payload['battery_voltage'],
                            RSSI: payload['signal_strength']
                        }
                        this.update_single_data(unparsed_topic, data, timestamp)
                        let device_to_log = {}
                        let data_to_log = {}
                        device_properties.forEach(device => {
                            if (device.topic == unparsed_topic) {
                                device_to_log = device;
                            }
                        })

                        if (device_to_log.log_raw == 1) {
                            data_to_log['node'] = device_to_log.id
                            data_to_log['meassurement_data'] = data;
                            this.db.device_model.device_has_table(device_to_log.id).then((clbk) => {
                                if (clbk == 1) {
                                    this.db.logger_model.log_single_data(device_to_log.id, data_to_log);
                                } else {
                                    this.db.device_model.create_device_table(device_to_log.id);
                                }
                            })
                        }
                    }

                }

            } catch (error) {
                console.log(error);
            }
        })
    }

    update_device_properties = async () => {
        this.db.device_model.get_devices()
            .then((results) => {
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
                    this.db.device_model.get_devices().then((results) => {
                        results.forEach(device => {
                            this.client.subscribe([device.topic], () => {
                                nodes_log_raw[device.topic] = device.log_raw;
                                if (device.log_raw == 1) {
                                    console.log(`raw data log enabled for ${device.name}`);
                                } else {
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

    add_topic_subscribe = async (topic) => {
        try {
            this.client.subscribe([topic], () => {
                console.log(`Subscribe to topic '${topic}'`);
            });
        } catch (error) {
            console.log(error);
        }
    }

    update_fft_feeder_data = async (topic, acc) => {
        acc.x_values.forEach(async newData => {
            try {
                if (acc_to_send[topic]['x'].length >= 4096) {
                    acc_to_send[topic]['x'].shift();
                }
            } catch (error) {
                acc_to_send[topic] = { x: [], y: [], z: [], x_kf: [], y_kf: [], z_kf: [] }
            }
            acc_to_send[topic]['x'].push(newData);
        });

        acc.y_values.forEach(async newData => {
            try {
                if (acc_to_send[topic]['y'].length >= 4096) {
                    acc_to_send[topic]['y'].shift();
                }
            } catch (error) {
                acc_to_send[topic] = { x: [], y: [], z: [], x_kf: [], y_kf: [], z_kf: [] }
            }
            acc_to_send[topic]['y'].push(newData);
        });

        acc.z_values.forEach(async newData => {
            try {
                if (acc_to_send[topic]['z'].length >= 4096) {
                    acc_to_send[topic]['z'].shift();
                }
            } catch (error) {
                acc_to_send[topic] = { x: [], y: [], z: [], x_kf: [], y_kf: [], z_kf: [] }
            }
            acc_to_send[topic]['z'].push(newData);
        });


        acc.xkf_values.forEach(async newData => {
            try {
                if (acc_to_send[topic]['x_kf'].length >= 4096) {
                    acc_to_send[topic]['x_kf'].shift();
                }
            } catch (error) {
                acc_to_send[topic] = { x: [], y: [], z: [], x_kf: [], y_kf: [], z_kf: [] }
            }
            acc_to_send[topic]['x_kf'].push(newData);
        });

        acc.ykf_values.forEach(async newData => {
            try {
                if (acc_to_send[topic]['y_kf'].length >= 4096) {
                    acc_to_send[topic]['y_kf'].shift();
                }
            } catch (error) {
                acc_to_send[topic] = { x: [], y: [], z: [], x_kf: [], y_kf: [], z_kf: [] }
            }
            acc_to_send[topic]['y_kf'].push(newData);
        });

        acc.zkf_values.forEach(async newData => {
            try {
                if (acc_to_send[topic]['z_kf'].length >= 4096) {
                    acc_to_send[topic]['z_kf'].shift();
                }
            } catch (error) {
                acc_to_send[topic] = { x: [], y: [], z: [], x_kf: [], y_kf: [], z_kf: [] }
            }
            acc_to_send[topic]['z_kf'].push(newData);
        });
        // console.log(acc_to_send);
    }

    remove_topic_subscribe = async (topic) => {
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

    update_acc_data_stream = async (payload) => {
        new Promise(() => {
            this.io.local.emit("accelerometer_stream", payload);
        });
        // this.io.local.emit("accelerometer_stream",payload);
    }

    log_acc_data = async (data_to_log) => {
        let topic = data_to_log.node;
        let device_to_log = {};
        device_properties.forEach(device => {
            if (device.topic == topic) {
                device_to_log = device;
            }
        })
        data_to_log['node'] = device_to_log.id
        // console.log(device_to_log.topic,device_to_log.id);

        this.db.device_model.device_has_table(device_to_log.id).then((clbk) => {
            if (clbk == 1) {
                this.db.logger_model.log_acc_array_data(device_to_log.id, data_to_log);
            } else {
                this.db.device_model.create_device_table(device_to_log.id);
            }
        })

    }


    update_acc_data = async (topic, payload, time_data, data_to_log) => {

        acc_data[topic] = {};
        acc_data[topic] = payload;
        acc_data[topic].timestamp = time_data;

        this.update_acc_data_stream(payload);
        this.io.local.emit(topic, acc_data[topic]);

        if (nodes_log_raw[topic] == 1) {
            this.log_acc_data(data_to_log).then(() => {
                log_info[topic] = new Date().getTime();
                this.io.local.emit(`${topic}_info`, log_info[topic]);
            })
        } else {
            log_info[topic] = undefined;
            this.io.local.emit(`${topic}_info`, log_info[topic]);
        }
        payload = {
            topic: topic,
            data: acc_data[topic]
        }
    }



    request_fft = async (topic, payload) => {
        payload['cid'] = topic
        payload['fs'] = payload['sampling_frequency']
        payload['x'] = acc_to_send[topic]['x']
        payload['y'] = acc_to_send[topic]['y']
        payload['z'] = acc_to_send[topic]['z']
        payload['x_kf'] = acc_to_send[topic]['x_kf']
        payload['y_kf'] = acc_to_send[topic]['y_kf']
        payload['z_kf'] = acc_to_send[topic]['z_kf']
        payload['peaks_req'] = 10
        console.log(payload['x_kf'].length)
        console.log(payload['y_kf'].length)
        console.log(payload['z_kf'].length)
        console.log("panjang ", payload['x'].length);
        new Promise(() => {
            this.wss.send(JSON.stringify(payload))
        })
    }
    update_single_data = async (topic, sensor_data, timestamp) => {
        single_data[topic] = {};
        single_data[topic] = sensor_data;
        // console.log(single_data[topic])
        this.io.local.emit(topic, single_data[topic]);
    }
}




module.exports = Mqtt_handler;
