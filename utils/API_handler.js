const tokenGenerator = require('uuid-token-generator');
const { user_model } = require('../model/database');
// const compressor = require('../assets/js/huffman')
const LZUTF8 = require('lzutf8');
const { response } = require('express');


class API_handler {
    constructor(app, db, mqtt) {
        this.mqtt = mqtt;
        app.post('/api/login_validator', async (req, res) => {
            console.log(req.body);
            let username = req.body.username;
            let password = req.body.password;
            console.log(req.body);
            let validated = await db.user_model.user_validation(username, password);
            if (validated.status) {
                let opt = {
                    maxAge: 2.628e+9
                };
                res.cookie('login_info', validated.uid, opt);
                let payload = {
                    status: "OK",
                    message: "Login success.",
                    status_code: 200
                }
                res.json(payload);
            } else {
                let payload = {
                    status: "ERROR",
                    message: "user not found or wrong input",
                    status_code: 404
                }
                res.json(payload);
            }
        });

        app.post('/api/register', async (req, res) => {
            let username = req.body.username;
            let password = req.body.password;
            console.log(req.body);
            let token = new tokenGenerator(1024);
            let new_token = token.generate();
            new_token = `${new_token}${new Date().getTime()}`;
            console.log(new_token);
            let validated = await db.user_model.user_register(username, password, new_token);
            if (validated) {
                let payload = {
                    status: "OK",
                    message: "Register success.",
                    status_code: 200
                }
                res.json(payload);
            }
            else {
                let payload = {
                    status: "ERROR",
                    message: `user ${username} already exist`,
                    status_code: 404
                }
                res.json(payload);
            }
        });

        app.get('/api/recorded_nodes', async (req, res) => {
            db.logger_model.get_nodes()
                .then((payload) => {
                    res.json(payload);
                })
        })

        app.get('/api/recorded_device', async (req, res) => {
            db.device_model.get_device_list()
                .then((payload) => {
                    res.json(payload);
                })
        })

        app.post('/api/get_node_data', async (req, res) => {
            let compressed = false;
            let id = req.body.id;
            let startTime = parseInt(Date.now());
            console.log({ id: id, "start": startTime })
            db.logger_model.get_node_datalog(id)
                .then((payloads) => {
                    try {
                        //ensure data is compatible with old version of logged data
                        let response = []
                        payloads.forEach(payload => {
                            if (payload.json[0] != '{') {
                                let processed_data = LZUTF8.decompress(payload.json, { inputEncoding: 'Base64' });
                                payload.json = processed_data;
                            }

                            if (payload.time_data.length > 16) {
                                if (payload.time_data[0] != '[') {
                                    let processed_time_data = LZUTF8.decompress(payload.time_data, { inputEncoding: 'Base64' });
                                    payload.time_data = processed_time_data;
                                }
                            }
                            response.push(payload);
                        });


                        if (compressed == true) {
                            let compressed_payload = LZUTF8.compress(JSON.stringify(response), { outputEncoding: 'Base64' });
                            res.json({ "data": compressed_payload, "compressed": true });
                            let finish = parseInt(Date.now()) - startTime;
                            console.log("finish", finish)
                        } else {
                            res.json({ "data": response, "compressed": false });
                            let finish = parseInt(Date.now()) - startTime;
                            console.log("finish", finish)
                        }

                    } catch (error) {
                        console.log(error)
                    }
                })
        })

        app.get('/api/devices', async (req, res) => {
            db.device_model.get_devices().then((result) => {
                let payload = { data: result };
                res.json(payload);
            });
        });

        app.post('/api/devices/add', async (req, res) => {
            let data = req.body;
            data['id'] = 'inst' + parseInt(new Date().getTime());
            db.device_model.add_device(data).then((result, error) => {
                if (result) {
                    let payload = { status: 'success adding device' };
                    this.mqtt.add_topic_subscribe(data.topic);
                    res.json(payload);
                } else {
                    res.json({ status: 'failed adding device' });
                }
            });
        });

        app.post('/api/devices/update', async (req, res) => {
            let data = req.body;
            console.log(data);
            db.device_model.get_topic_by_id(data.id).then((topic_old) => {
                db.device_model.update_device(data).then((result, error) => {
                    if (result) {
                        let payload = { status: 'success updating device' };
                        let topics = {
                            old: topic_old[0].topic,
                            new: data.topic
                        };
                        this.mqtt.update_topic_subscribe(topics);
                        res.json(payload);
                    } else {
                        res.json({ status: 'failed updating device' });
                    }
                });
            });
        });

        app.post('/api/devices/remove', async (req, res) => {
            let id = req.body.id;
            db.device_model.get_topic_by_id(id).then((data) => {
                this.mqtt.remove_topic_subscribe(data[0].topic);
                db.device_model.delete_device(id).then((result, error) => {
                    if (result) {
                        let payload = { status: 'success removing device' };
                        res.json(payload);
                    } else {
                        res.json({ status: 'failed removing device' });
                    }
                });
            })
        });

        app.post('/api/monitoring/set_config', async (req, res) => {
            db.monitoring_model.updateConfig(req.body);
            res.json(req.body);
        });
        app.get('/api/monitoring/get_config', async (req, res) => {
            db.monitoring_model.getConfig()
                .then((result) => {
                    res.json({ "data": result });
                })
        });

        app.get('/get_acc', async (req, res) => {
            // http://localhost:5555/get_acc?node=node_1&start=1616166161&offset=0
            let node = req.query.node;
            let limit = req.query.limit;
            let offset = req.query.offset;
            let unix = req.query.start;

            let json_string = []
            let time_data_string = []

            let response = {
                'count': 0,
                'x': [],
                'y': [],
                'z': [],
                'timestamp': []
            }

            db.logger_model.get_data_bundle(node, unix, limit, offset).then((result) => {
                result.forEach(element => {
                    json_string.push(element.json);
                    time_data_string.push(element.time_data);
                });

                res.json({
                    json: json_string,
                    time_data: time_data_string
                });
                res.json(response);
            });
        });
    }
}

module.exports = API_handler;