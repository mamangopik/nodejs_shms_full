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
    io.local.emit(topic,single_data[topic]);
}
//ws functions
io.on('connection',(socket)=>{
    console.log('got connection');
})
