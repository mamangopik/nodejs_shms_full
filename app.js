require('dotenv').config();

app_port = process.env.PORT
db_host = process.env.DB_HOST
db_user = process.env.DB_USER
db_pwd = process.env.DB_PWD
db_name = process.env.DB_NAME
const Database = require('./model/database');
const sqlite = require('./model/sqlitedb');
const db = new Database(db_host, db_user, db_pwd, db_name);
const path = require('path')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const express = require('express');
const bodyParser = require('body-parser');
const { start } = require('repl');
const socket = require('socket.io');
const tokenGenerator = require('uuid-token-generator');

const app = express();
const server = app.listen(app_port);
//ws setup
const io = socket(server);
app.all('/', function (request, response, next) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});
//global variable for acc_data
var acc_data = {}
var single_data = {}
var hardware_info = {}

const update_acc_data = async (topic,payload,time_data)=>{
    acc_data[topic]={};
    acc_data[topic] = payload;
    acc_data[topic].timestamp = time_data;
    io.local.emit(topic,acc_data[topic]);
}

const update_single_data = async (topic,sensor_data,timestamp)=>{
    single_data[topic]={};
    single_data[topic] = sensor_data;
    io.local.emit('single_data',single_data[topic]);
}


// alloc CORS untuk API
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});



//ws functions
io.on('connection',(socket)=>{
    console.log('got connection');
})



// Parse JSON and URL-encoded bodies untuk http POST
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
// aplikasi mengakses directory 'public' untuk local aset (foto,css,js)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/realtime_graph/accelerometer',async(req,res)=>{
    const static_view = __dirname+'/view/fft_plot.html';
    res.sendFile(static_view);
});

app.get('/realtime_graph/single_data',async(req,res)=>{
    const static_view = __dirname+'/view/single_plot.html';
    res.sendFile(static_view);
});

app.get('/',async(req,res)=>{
    const static_view = __dirname+'/view/login.html';
    res.sendFile(static_view);
});

app.get('/register',async(req,res)=>{
    const static_view = __dirname+'/view/register.html';
    res.sendFile(static_view);
});


app.get('/devices',async(req,res)=>{
    const static_view = __dirname+'/view/devices.html';
    const userData = req.cookies.login_info;
    if (userData) {
        res.sendFile(static_view);
    } else {
        console.log("belom login");
        res.redirect('/');
    }
});

app.post('/api/login_validator',async(req,res)=>{
    username = req.body.username;
    password = req.body.password;
    console.log(req.body);
    validated = await db.user_validation(username,password);
    if (validated.status){
        randomNumber=Math.random().toString();
        opt = { 
                maxAge: 2.628e+9
            };
        res.cookie('login_info',validated.uid, opt);
        payload={
            status:"OK",
            message: "Login success.",
            status_code:200
        }
        res.json(payload);
    }else{
        payload={
            status:"ERROR",
            message: "user not found or wrong input",
            status_code:404
        }
        res.json(payload);
    }
});

app.post('/api/register',async(req,res)=>{
    username = req.body.username;
    password = req.body.password;
    console.log(req.body);
    token = new tokenGenerator(1024);
    new_token = token.generate();
    new_token = `${new_token}${new Date().getTime()}`;
    console.log(new_token);
    validated = await db.user_register(username,password,new_token);
    if (validated){
        payload={
            status:"OK",
            message: "Register success.",
            status_code:200
        }
        res.json(payload);
    }
    else{
        payload={
            status:"ERROR",
            message: `user ${username} already exist`,
            status_code:404
        }
        res.json(payload);
    }
});


app.get('/api/devices',async(req,res)=>{
    db.get_devices().then((result)=>{
        payload = {data:result};
        res.json(payload);
    });
});

app.post('/api/devices/add',(req,res)=>{
    data = req.body;
    data['id'] = 'inst'+parseInt(new Date().getTime());
    db.add_device(data).then((result,error)=>{
        if(result){
            payload = {status:'success adding device'};
            add_topic_subscribe(data.topic);
            res.json(payload);
        }else{
            res.json({status:'failed adding device'});
        }
    });
});

app.post('/api/devices/update',(req,res)=>{
    data = req.body;
    db.get_topic_by_id(data.id).then((topic_old)=>{
        db.update_device(data).then((result,error)=>{
            if(result){
                payload = {status:'success updating device'};
                topics = {
                    old:topic_old[0].topic,
                    new:data.topic
                };
                update_topic_subscribe(topics);
                res.json(payload);
            }else{
                res.json({status:'failed updating device'});
            }
        });
    });    
});

app.post('/api/devices/remove',async (req,res)=>{
    id = req.body.id;
    db.get_topic_by_id(id).then((data)=>{
        remove_topic_subscribe(data[0].topic);
        db.delete_device(id).then((result,error)=>{
            if(result){
                payload = {status:'success removing device'};
                res.json(payload);
            }else{
                res.json({status:'failed removing device'});
            }
        });
    })    
});

app.get('/get_acc', async (req, res) => {  
    // http://localhost:5555/get_acc?node=node_1&start=1616166161&offset=0
    node = req.query.node;
    limit = req.query.limit;
    offset = req.query.offset;
    unix = req.query.start;

    json_string = []
    time_data_string=[]

    response = {
        'count':0,
        'x':[],
        'y':[],
        'z':[],
        'timestamp':[]
    }

    db.get_data_bundle(node,unix,limit,offset).then((result)=>{
        result.forEach(element => {
            json_string.push(element.json);
            time_data_string.push(element.time_data)
        });


        time_data_buff=[]
        x_buff=[]
        y_buff=[]
        z_buff=[]

        time_data_string.forEach(element => {
            time_data = JSON.parse(element);
            time_data.forEach(time_element => {
                time_data_buff.push(time_element);
            });
        });

        json_string.forEach(element => {
            json = JSON.parse(element);
            json.x_values.forEach(x => {
                x_buff.push(x)
            });

            json.y_values.forEach(y => {
                y_buff.push(y)
            });

            json.z_values.forEach(z => {
                z_buff.push(z)
            });
        });

        response.x=x_buff;
        response.y=y_buff;
        response.z=z_buff;
        response.timestamp=time_data_buff;
        response.count=response.z.length;

        res.json(response);
    });
});


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


client.on('connect', () => {
    db.get_devices().then((results)=>{
        results.forEach(device => {
            client.subscribe([device.topic], () => {
                console.log(`Subscribe to topic '${device.topic}'`);
                client.publish(device.topic, ' ', { qos: 0, retain: false });
            })
        });
    });
})


const update_topic_subscribe = (topics) => {
    try {
        console.log(topics);
        client.unsubscribe(topics.old, (unsubscribeErr) => {
          if (!unsubscribeErr) {
            console.log(`Unsubscribed from topic: ${topics.old}`);
            client.subscribe([topics.new], () => {
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

const add_topic_subscribe = async(topic) => {
    try {
        client.subscribe([topic], () => {
            console.log(`Subscribe to topic '${topic}'`);
        });
    } catch (error) {
        console.log(error);
    }
}

const remove_topic_subscribe = async(topic) => {
    try {
        client.unsubscribe(topic, (unsubscribeErr) => {
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

client.on('message', async (topic, payload) => {
    unparsed_topic = topic;
    topic = topic.replace('/shms/','');
    topic = topic.replace('/accelerometer','');
    payload = payload.toString();
    // console.log(payload);
    try {
        time_data_in = (new Date().getTime() / 1000);
        obj={};
        payload = JSON.parse(payload);
        if(payload['sensor_type']=='accelerometer'){
            data_len = payload.x_values.length;
            obj['node']=unparsed_topic;
            obj['timestamp']=Math.floor(time_data_in);
            obj['meassurement_data']=payload;

            obj['time_data']=[];
            for (let i=0;i<data_len;i++){
                time_to_push = time_data_in-((data_len-i)*0.005); //for 5ms sampling delay (200Hz)
                obj.time_data.push(time_to_push);
            }
            // db.log_data(obj).then(()=>{
            //     console.log("data logged to local DB");    
            // });
            sqlite.log_acc_data(obj)
            sqlite.log_acc_data(obj)
            sqlite.log_acc_data(obj)
            sqlite.log_acc_data(obj)
            // sqlite.log_acc_data(obj)
            // sqlite.log_acc_data(obj)
            // sqlite.log_acc_data(obj)
            // sqlite.log_acc_data(obj)
            // .then(()=>{
            //     console.log("data logged to local DB");    
            // });
            update_acc_data(unparsed_topic,payload,obj.time_data)
        }

        if(payload['sensor_type']=='single_data'){
            sensor_data = payload.value;
            timestamp = (new Date().getTime() / 1000);
            data = {
                value:payload.value,
                timestamp:timestamp,
                label:payload.label,
                topic:unparsed_topic
            }
            update_single_data(unparsed_topic,data,timestamp)
            // db.log_single_data(data).then(()=>{
            //     console.log("data logged to local DB");    
            // });
        }
        
    } catch (error) {
        console.log(error);
    }
})